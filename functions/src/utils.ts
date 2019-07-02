import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp, DocumentReference} from '@google-cloud/firestore'

export async function countSubscribers(context: functions.EventContext, subscription: FirebaseFirestore.DocumentData) {
    try {
        const userId: string = subscription.user.id
        const db = admin.firestore()
        const snapshot = await db.collection('subscriptions').where('user.id', '==', userId).get()
        await db.doc(`users/${userId}`).set({ subscribers: snapshot.size }, { merge: true })
        console.log(`succeed to count subscribers | subscriptionId: ${context.params.subscriptionId}`)
        await updateLastSeen(userId)
    } catch (err) {
        console.log(`failed to count subscribers | subscriptionId: ${context.params.subscriptionId} | ${err}`)
    }
}

export async function countSubscriptions(context: functions.EventContext, subscription: FirebaseFirestore.DocumentData) {
    try {
        const subscriberId: string = subscription.subscriber.id
        const db = admin.firestore()
        const snapshot = await db.collection('subscriptions').where('subscriber.id', '==', subscriberId).get()
        await db.doc(`users/${subscriberId}`).set({ subscriptions: snapshot.size }, { merge: true })
        console.log(`succeed to count subscriptions | subscriptionId: ${context.params.subscriptionId}`)
        await updateLastSeen(subscriberId)
    } catch (err) {
        console.log(`failed to count subscriptions | subscriptionId: ${context.params.subscriptionId} | ${err}`)
    }
}

export async function countBookmarks(context: functions.EventContext, bookmark: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = bookmark.post.id
        const db = admin.firestore()
        const snapshot = await db.collection('bookmarks').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ bookmarks: snapshot.size }, { merge: true })
        console.log(`succeed to count bookmarks | bookmarkId: ${context.params.bookmarkId}`)
        await Promise.all([
            calculatePostScore(postId),
            updateLastSeen(bookmark.user.id)
        ])
    } catch (err) {
        console.log(`failed to count bookmarks | bookmarkId: ${context.params.bookmarkId} | ${err}`)
    }
}

export async function countPostReadings(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = reading.post.id
        const db = admin.firestore()
        const snapshot = await db.collection('readings').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ readings: snapshot.size }, { merge: true })
        console.log(`succeed to count readings for post | readingId: ${context.params.readingId}`)
        await Promise.all([
            calculatePostScore(postId),
            updateLastSeen(reading.user.id),
            countTopicReadings(context, reading)
        ])
    } catch (err) {
        console.log(`failed to count readings for post | readingId: ${context.params.readingId} | ${err}`)
    }
}

export async function countShares(context: functions.EventContext, share: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = share.post.id
        const db = admin.firestore()
        const snapshot = await db.collection('shares').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ shares: snapshot.size }, { merge: true })
        console.log(`succeed to count shares | shareId: ${context.params.shareId}`)
        await Promise.all([
            calculatePostScore(postId),
            updateLastSeen(share.user.id)
        ])
    } catch (err) {
        console.log(`failed to count shares | shareId: ${context.params.shareId} | ${err}`)
    }
}

export async function calculateRating(context: functions.EventContext, rating: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = rating.post.id
        const db = admin.firestore()
        const snapshot = await db.collection('ratings').where('post.id', '==', postId).get()
        let sum = 0
        snapshot.forEach(doc => {
            const data = doc.data()
            if (data) {
                const value: number = data.value
                sum += value
            }
        })
        const postRating = sum / snapshot.size
        const roundedRating = round(postRating, 1) // 1 decimal, uma casa decimal
        await db.doc(`posts/${postId}`).set({ rating: roundedRating }, { merge: true })
        console.log(`succeed to update rating | ratingId: ${context.params.ratingId}`)
        await Promise.all([
            calculatePostScore(postId),
            updateLastSeen(rating.user.id)
        ])
    } catch (err) {
        console.log(`failed to update rating | ratingId: ${context.params.ratingId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

export async function initializePost(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const data = {
            bookmarks: 0,
            readings: 0,
            rating: 0,
            shares: 0,
            score: 0
        }
        const db = admin.firestore()
        await db.doc(`posts/${context.params.postId}`).set(data, { merge: true })
        console.log(`succeed to initialize post | postId: ${context.params.postId}`)
        await Promise.all([
            countTopicPosts(context, post),
            countTopicUsers(context, post),
            countUserPosts(context, post),
            calculateUserTopTopic(),
            createFeedEntryForEachSubscriber(context, post),
            updateLastSeen(post.user.id)
        ])
    } catch (err) {
        console.log(`failed to initialize post | postId: ${context.params.postId} | ${err}`)
    }

    async function calculateUserTopTopic() {
        try {
            const userId: string = post.user.id
            const db = admin.firestore()
            const userSnapshot = await db.doc(`users/${userId}`).get()
            const user = userSnapshot.data()
            if (user) {
                const topTopic = {
                    id: "",
                    total_posts: 0
                }
                for (const topicId in user.topics) {
                    let total_posts = 0
                    const postsSnapshot = await db.collection('posts').where('user.id', '==', userId).get()
                    postsSnapshot.forEach(doc => {
                        const postData = doc.data()
                        if (postData)
                            if (postData.topic.id === topicId)
                                total_posts += 1
                    })
                    if (total_posts > topTopic.total_posts) {
                        topTopic.id = topicId
                        topTopic.total_posts = total_posts
                    }
                }
                if (topTopic.id !== "")
                    await db.doc(`users/${userId}`).set({ top_topic: topTopic.id }, { merge: true })
            }
            console.log(`succeed to calculate user's top topic`)
        } catch (err) {
            console.log(`failed to calculate user's top topic | ${err}`)
        }
    }

}

export async function initializeTopic(context: functions.EventContext) {
    try {
        const data = {
            posts: 0,
            users: 0,
            readings: 0,
            score: 0
        }
        const db = admin.firestore()
        await db.doc(`topics/${context.params.topicId}`).set(data, { merge: true })
        console.log(`succeed to initialize topic | topicId: ${context.params.topicId}`)
    } catch (err) {
        console.log(`failed to initialize topic | topicId: ${context.params.topicId} | ${err}`)
    }
}

export async function initializeUser(user: admin.auth.UserRecord) {
    try {
        const data = {
            name: user.displayName,
            email: user.email,
            pic: user.photoURL,
            since: Timestamp.now(),
            subscribers: 0,
            subscriptions: 0,
            posts: 0
        }
        const db = admin.firestore()
        await db.doc(`users/${user.uid}`).set(data, { merge: true })
        console.log(`succeed to initialize user | userId: ${user.uid}`)
        await Promise.all([
            createFeedToNewUser(user),
            updateLastSeen(user.uid)
        ])
    } catch (err) {
        console.log(`failed to initialize user | userId: ${user.uid} | ${err}`)
    }
}

export async function markInactiveUsers() {
    try {
        const oneDay = 60 * 60 * 24
        const oneWeek = 7 * oneDay
        const oneWeekAgo = Timestamp.now().seconds - oneWeek
        const db = admin.firestore()
        const snapshot = await db.collection('sessions').orderBy('timestamp').get()
        const promises: Promise<FirebaseFirestore.WriteResult>[] = []
        snapshot.forEach(doc => {
            const session = doc.data()
            if (session) {
                const timestamp: Timestamp = session.timestamp
                if (timestamp.seconds < oneWeekAgo) {
                    const promise = db.doc(`users/${session.user.id}`).set({ active: false}, { merge: true })
                    promises.push(promise)
                }
            }
        })
        await Promise.all(promises)
        console.log(`succeed to mark inactive users | total: ${promises.length}`)
        await deleteFeedEntriesForInactiveUser()
    } catch (err) {
        console.log(`failed to mark inactive users | ${err}`)
    }
}

async function createFeedToNewUser(user: admin.auth.UserRecord) {
    try {
        const userId: string = user.uid
        const db = admin.firestore()
        const snapshot = await db.collection('posts').orderBy('score', 'desc').limit(20).get()
        const promises: Promise<DocumentReference>[] = []
        snapshot.forEach(doc => {
            const post = doc.data()
            if (post) {
                const feed: FirebaseFirestore.DocumentData = {
                    post: {
                        id: doc.id,
                        title: post.title,
                        pic: post.pic,
                        timestamp: post.timestamp,
                        user: post.user,
                        score: post.score
                    },
                    subscriber: { id: userId }
                }
                const promise = db.collection('feeds').add(feed)
                promises.push(promise)
            }
        })
        await Promise.all(promises)
        console.log(`succeed to create feed to new user | userId: ${user.uid}`)
    } catch (err) {
        console.log(`failed to create feed to new user | userId: ${user.uid} | ${err}`)
    }
}

async function createFeedEntryForEachSubscriber(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const userId: string = post.user.id
        const feed: FirebaseFirestore.DocumentData = {
            title: post.title,
            pic: post.pic,
            timestamp: post.timestamp,
            user: {
                id: userId,
                name: post.user.name
            },
            content_id: context.params.postId
        }
        const db = admin.firestore()
        const snapshot = await db.collection('subscriptions').where('user.id', '==', userId).get()
        const promises: Promise<DocumentReference>[] = []
        snapshot.forEach(doc => {
            const subscription = doc.data()
            if (subscription) {
                feed.subscriber.id = subscription.subscriber.id
                const promise = db.collection('feeds').add(feed)
                promises.push(promise)
            }
        })
        await Promise.all(promises)
        console.log(`succeed to create ${promises.length} feed entries | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to create feed entries | postId: ${context.params.postId} | ${err}`)
    }
}

async function countTopicPosts(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const topicId: string = post.topic.id
        const snapshot = await db.collection('posts').where('topic.id', '==', topicId).get()
        await db.doc(`topics/${topicId}`).set({ posts: snapshot.size }, { merge: true })
        console.log(`succeed to count topic's posts | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to count topic's posts | postId: ${context.params.postId} | ${err}`)
    }
}

async function countTopicUsers(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const topicId: string = post.topic.id
        const snapshot = await db.collection('users').where('topic.id', '==', topicId).get()
        await db.doc(`topics/${topicId}`).set({ users: snapshot.size }, { merge: true })
        console.log(`succeed to count topic's posts | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to count topic's posts | postId: ${context.params.postId} | ${err}`)
    }
}

async function countUserPosts(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const userId: string = post.user.id
        const snapshot = await db.collection('posts').where('user.id', '==', userId).get()
        await db.doc(`users/${userId}`).set({ posts: snapshot.size }, { merge: true })
        console.log(`succeed to count user's posts | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to count user's posts | postId: ${context.params.postId} | ${err}`)
    }
}

async function countTopicReadings(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        const topicId: string = reading.post.topic.id
        const db = admin.firestore()
        const snapshot = await db.collection('readings').where('post.topic.id', '==', topicId).get()
        await db.doc(`topics/${topicId}`).set({ readings: snapshot.size }, { merge: true })
        console.log(`succeed to count readings for topic | readingId: ${context.params.readingId}`)
        await calculateTopicScore(reading.post.id)
    } catch (err) {
        console.log(`failed to count readings for topic | readingId: ${context.params.readingId} | ${err}`)
    }
}

async function calculatePostScore(postId: string) {
    try {
        const db = admin.firestore()
        const snapshot = await db.doc(`posts/${postId}`).get()
        const post = snapshot.data()
        if (post) {
            const timestamp: FirebaseFirestore.Timestamp = post.timestamp
            const score: number = getFactor(10, post.readings)
                + getFactor(10, post.bookmarks)
                + getFactor(10, post.shares)
                + getFactor(20, post.rating)
                - getFactor(50, timestamp.toMillis())
            await db.doc(`posts/${postId}`).set({score: score}, {merge: true})
            console.log(`succeed to calculate post's score`)
            await propagatePostScore()
        }
    } catch (err) {
        console.log(`failed to calculate post's score | ${err}`)
    }
    
    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

    async function propagatePostScore() {
        try {
            const db = admin.firestore()
            const postSnapshot = await db.doc(`posts/${postId}`).get()
            const post = postSnapshot.data()
            if (post) {
                const score: number = post.score
                const snapshot = await db.collection('feeds').where('content_id', '==', postId).get()
                const promises: Promise<FirebaseFirestore.WriteResult>[] = []
                snapshot.forEach(doc => {
                    const promise = db.doc(`feeds/${doc.id}`).set({ score: score }, { merge: true })
                    promises.push(promise)
                })
                await Promise.all(promises)
                console.log(`succeed to propagate post's score`)
            }
        } catch (err) {
            console.log(`failed to propagate post's score | ${err}`)
        }
    }

}

async function calculateTopicScore(postId: string) {
    try {
        const db = admin.firestore()
        const snapshot = await getTopic()
        if (snapshot !== null) {
            const topic = snapshot.data()
            if (topic){
                const score: number = getFactor(25, topic.posts)
                    + getFactor(25, topic.users)
                    + getFactor(50, topic.readings)
                await db.doc(`topics/${snapshot.id}`).set({ score: score }, { merge: true })
                console.log(`succeed to calculate topic's score`)
            }
        }
    } catch (err) {
        console.log(`failed to calculate topic's score | ${err}`)
    }

    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

    async function getTopic() {
        const db = admin.firestore()
        const postSnapshot = await db.doc(`posts/${postId}`).get()
        const post = postSnapshot.data()
        if (post)
            return await db.doc(`topics/${post.topic.id}`).get()
        return null
    }

}

async function updateLastSeen(userId: string) {
    try {
        const data = {
            user: {
                id: userId
            },
            timestamp: Timestamp.now()
        }
        const db = admin.firestore()
        await Promise.all([
            db.doc(`sessions/${userId}`).set(data, { merge: true }),
            db.doc(`users/${userId}`).set({ active: true }, { merge: true})
        ])
        console.log(`succeed to update user's last seen | userId: ${userId}`)
    } catch (err) {
        console.log(`failed to update user's last seen | userId: ${userId} | ${err}`)
    }
}

async function deleteFeedEntriesForInactiveUser() {
    try {
        // this function has some kind of special code for me
        // it has two levels of promises L1 and L2
        // when i execute in parallel promises from level 1
        // it is actually executing in parallel every single promise of level 2
        const db = admin.firestore()
        const snapshot = await db.collection('users').orderBy('active').get()
        const promisesL1: (() => Promise<FirebaseFirestore.WriteResult[]>)[] = []
        snapshot.forEach(docL1 => {
            const user = docL1.data()
            if (user) {
                if (user.active === false) {
                    const promise = async () => {
                        const feedSnapshot = await db.collection('feeds').where('subscriber.id', '==', docL1.id).get()
                        const promisesL2: Promise<FirebaseFirestore.WriteResult>[] = []
                        feedSnapshot.forEach(docL2 => promisesL2.push(docL2.ref.delete()))
                        return Promise.all(promisesL2)
                    }
                    promisesL1.push(promise)
                }
            }
        })
        await Promise.all(promisesL1)
        console.log(`succeed to delete feed entries for each inactive user | total: ${1}`)
    } catch (err) {
        console.log(`failed to delete feed entries for each inactive user | ${err}`)
    }
}