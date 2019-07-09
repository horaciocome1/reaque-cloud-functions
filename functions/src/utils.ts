import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

const db = admin.firestore()

const merge = { merge: true }

export async function handleSubscription(context: functions.EventContext, create: boolean) {
    try {
        const promises = [
            updateSubscriptions(),
            updateLastSeen(context.params.userId)
        ]
        if (create === true)
            promises.push(addSubscriberDataToSubscribedUser())
        else
            promises.push(removeSubscriberDataFromSubscribedUser())
        await Promise.all(promises)
        console.log(`succeed to handle subscription | userId: ${context.params.userId}`)
    } catch (err) {
        console.log(`failed to handle subscription | userId: ${context.params.userId} | ${err}`)
    }

    async function updateSubscriptions() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user)
                    if (create === true)
                        await t.update(ref, { subscriptions: user.subscriptions + 1 })
                    else
                        await t.update(ref, { subscriptions: user.subscriptions - 1 })
            })
            console.log(`succeed to update subscriptions | userId: ${context.params.userId}`)
            await propagateUserUpdates(context.params.userId)
        } catch (err) {
            console.log(`failed to update subscriptions | userId: ${context.params.userId} | ${err}`)
        }
    }

    async function addSubscriberDataToSubscribedUser() {
        try {
            await db.runTransaction(async t => {
                let ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user) {
                    const data = {
                        name: user.name,
                        pic: user.pic,
                        subscribers: user.subscribers,
                        top_topic: user.top_topic,
                        timestamp: Timestamp.now()
                    }
                    ref = db.doc(`users/${context.params.subscriptionId}/subscribers/${context.params.userId}`)
                    await t.set(ref, data)
                }
            })
            console.log(`succeed to add subscriber data to subscribed user | userId: ${context.params.subscriptionId}`)
            await updateSubscribers()
        } catch (err) {
            console.log(`failed to add subscriber data to subscribed user | userId: ${context.params.subscriptionId} | ${err}`)
        }
    }

    async function removeSubscriberDataFromSubscribedUser() {
        try {
            await db.doc(`users/${context.params.subscriptionId}/subscribers/${context.params.userId}`).delete()
            console.log(`succeed to remove subscriber data from subscribed user | userId: ${context.params.subscriptionId}`)
            await updateSubscribers()
        } catch (err) {
            console.log(`failed to remove subscriber data from subscribed user | userId: ${context.params.subscriptionId} | ${err}`)
        }
    }

    async function updateSubscribers() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`users/${context.params.subscriptionId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user)
                    if (create === true)
                        await t.update(ref, { subscribers: user.subscribers + 1 })
                    else
                        await t.update(ref, { subscribers: user.subscribers - 1 })
            })
            console.log(`succeed to update subscribers | userId: ${context.params.subscriptionId}`)
            await propagateUserUpdates(context.params.subscriptionId)
        } catch (err) {
            console.log(`failed to update subscribers | userId: ${context.params.subscriptionId} | ${err}`)
        }
    }

}

export async function handleBookmark(context: functions.EventContext, create: boolean) {
    try {
        const promises = [
            updateLastSeen(context.params.userId)
        ]
        if (create === true)
            promises.push(addUserDataToPost())
        else
            promises.push(removeUserDataFromPost())
        await Promise.all(promises)
        console.log(`succeed to handle bookmark | userId: ${context.params.userId}`)
    } catch (err) {
        console.log(`failed to handle bookmark | userId: ${context.params.userId} | ${err}`)
    }

    async function addUserDataToPost() {
        try {
            await db.runTransaction(async t => {
                let ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user) {
                    const data = {
                        name: user.name,
                        pic: user.pic,
                        subscribers: user.subscribers,
                        top_topic: user.top_topic,
                        timestamp: Timestamp.now()
                    }
                    ref = db.doc(`posts/${context.params.bookmarkId}/bookmarks/${context.params.userId}`)
                    await t.set(ref, data)
                }
            })
            console.log(`succeed to add user data to post | postId: ${context.params.bookmarkId}`)
            await updateBookmarks()
        } catch (err) {
            console.log(`failed to add user data to post | postId: ${context.params.bookmarkId} | ${err}`)
        }
    }

    async function removeUserDataFromPost() {
        try {
            await db.doc(`posts/${context.params.bookmarkId}/bookmarks/${context.params.userId}`).delete()
            console.log(`succeed to remove user data from post | postId: ${context.params.bookmarkId}`)
            await updateBookmarks()
        } catch (err) {
            console.log(`failed to remove user data from post | postId: ${context.params.bookmarkId} | ${err}`)
        }
    }

    async function updateBookmarks() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`posts/${context.params.bookmarkId}`)
                const snapshot = await t.get(ref)
                const post = snapshot.data()
                if (post)
                    if (create === true)
                        await t.update(ref, { bookmarks: post.bookmarks + 1 })
                    else
                        await t.update(ref, { bookmarks: post.bookmarks - 1 })
            })
            console.log(`succeed to update bookmarks | postId: ${context.params.bookmarkId}`)
            await calculatePostScore(context.params.bookmarkId)
        } catch (err) {
            console.log(`failed to update bookmarks | postId: ${context.params.bookmarkId} | ${err}`)
        }
    }

}

export async function handleReading(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        await Promise.all([
            addUserDataToPost(),
            updateLastSeen(context.params.userId)
        ])
        console.log(`succeed to handle reading | readingId: ${context.params.readingId}`)
    } catch (err) {
        console.log(`failed to handle reading | readingId: ${context.params.readingId} | ${err}`)
    }

    async function addUserDataToPost() {
        try {
            await db.runTransaction(async t => {
                let ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user) {
                    const data = {
                        name: user.name,
                        pic: user.pic,
                        subscribers: user.subscribers,
                        top_topic: user.top_topic,
                        timestamp: Timestamp.now()
                    }
                    ref = db.doc(`posts/${context.params.readingId}/readings/${context.params.userId}`)
                    await t.set(ref, data)
                }
            })
            console.log(`succeed to add user data to post | postId: ${context.params.readingId}`)
            await updateReadings()
        } catch (err) {
            console.log(`failed to add user data to post | postId: ${context.params.readingId} | ${err}`)
        }

        async function updateReadings() {
            try {
                await db.runTransaction(async t => {
                    const ref = db.doc(`posts/${context.params.readingId}`)
                    const snapshot = await t.get(ref)
                    const post = snapshot.data()
                    if (post)
                        await t.update(ref, { readings: post.readings + 1 })
                })
                console.log(`succeed to update readings | postId: ${context.params.readingId}`)
                await Promise.all([
                    calculatePostScore(context.params.readingId),
                    updateTopicReadings()
                ])
            } catch (err) {
                console.log(`failed to update readings | postId: ${context.params.readingId} | ${err}`)
            }
    
            async function updateTopicReadings() {
                try {
                    await db.runTransaction(async t => {
                        const ref = db.doc(`topics/${reading.topic.id}`)
                        const snapshot = await t.get(ref)
                        const topic = snapshot.data()
                        if (topic)
                            await t.update(ref, { readings: topic.readings + 1 })
                    })
                    console.log(`succeed to update readings for topic | readingId: ${reading.topic.id}`)
                    await calculateTopicScore(reading.topic.id)
                } catch (err) {
                    console.log(`failed to update readings for topic | readingId: ${reading.topic.id} | ${err}`)
                }
            }
    
        }

    }

}

export async function handleShare(context: functions.EventContext) {
    try {
        await Promise.all([
            addUserDataToPost(),
            updateLastSeen(context.params.userId)
        ])
        console.log(`succeed to handle share | shareId: ${context.params.shareId}`)
    } catch (err) {
        console.log(`failed to handle share | shareId: ${context.params.shareId} | ${err}`)
    }

    async function addUserDataToPost() {
        try {
            await db.runTransaction(async t => {
                let ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user) {
                    const data = {
                        name: user.name,
                        pic: user.pic,
                        subscribers: user.subscribers,
                        top_topic: user.top_topic,
                        timestamp: Timestamp.now()
                    }
                    ref = db.doc(`posts/${context.params.readingId}/shares/${context.params.userId}`)
                    await t.set(ref, data)
                }
            })
            console.log(`succeed to add user data to post | postId: ${context.params.shareId}`)
            await updateShares()
        } catch (err) {
            console.log(`failed to add user data to post | postId: ${context.params.shareId} | ${err}`)
        }

        async function updateShares() {
            try {
                await db.runTransaction(async t => {
                    const ref = db.doc(`posts/${context.params.shareId}`)
                    const snapshot = await t.get(ref)
                    const post = snapshot.data()
                    if (post)
                        await t.update(ref, { shares: post.shares + 1 })
                })
                console.log(`succeed to update shares | postId: ${context.params.shareId}`)
                await calculatePostScore(context.params.shareId)
            } catch (err) {
                console.log(`failed to count shares | postId: ${context.params.shareId} | ${err}`)
            }
        }
        
    }

}

export async function calculateRating(context: functions.EventContext, rating: FirebaseFirestore.DocumentData) {
    try {
        await Promise.all([
            addUserDataToPost(),
            updateLastSeen(context.params.userId)
        ])
        await db.runTransaction(async t => {
            const ref = db.collection(`posts/${context.params.ratingId}/ratings`)
            const snapshot = await t.get(ref)
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
            const ref2 = db.doc(`posts/${context.params.ratingId}`)
            await t.update(ref2, { rating: roundedRating })
        })
        console.log(`succeed to calculate rating | postId: ${context.params.ratingId}`)
        await calculatePostScore(context.params.ratingId)
    } catch (err) {
        console.log(`failed to calculate rating | postId: ${context.params.ratingId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    async function addUserDataToPost() {
        try {
            await db.runTransaction(async t => {
                let ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user) {
                    const data = {
                        name: user.name,
                        pic: user.pic,
                        subscribers: user.subscribers,
                        top_topic: user.top_topic,
                        timestamp: Timestamp.now(),
                        value: rating.value,
                        message: rating.message
                    }
                    ref = db.doc(`posts/${context.params.readingId}/ratings/${context.params.userId}`)
                    await t.set(ref, data)
                }
            })
            console.log(`succeed to add user data to post | postId: ${context.params.shareId}`)
        } catch (err) {
            console.log(`failed to add user data to post | postId: ${context.params.shareId} | ${err}`)
        }
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
        await db.doc(`posts/${context.params.postId}`).set(data, merge)
        console.log(`succeed to initialize post | postId: ${context.params.postId}`)
        await Promise.all([
            addPostDataToUser(),
            addPostDataToTopic(),
            addUserDataToTopic(),
            updateTopicPosts(),
            updateTopicUsers(),
            updateUserPosts(),
            createFeedEntryForEachSubscriber(),
            updateLastSeen(post.user.id)
        ])
        await propagateUserUpdates(post.user.id)
        await calculateTopicScore(post.topic.id)
    } catch (err) {
        console.log(`failed to initialize post | postId: ${context.params.postId} | ${err}`)
    }

    async function addPostDataToUser() {
        try {
            const postId = context.params.postId
            const data = {
                timestamp: post.timestamp,
                title: post.title,
                pic: post.pic,
                user: post.user,
                score: 0
            }
            await db.doc(`users/${post.user.id}/posts/${postId}`).set(data, merge)
            console.log(`succeed to add post data to its user's subcollection | postId: ${context.params.postId}`)
        } catch (err) {
            console.log(`failed to add post data to its user's subcollection | postId: ${context.params.postId} | ${err}`)
        }
    }

    async function addPostDataToTopic() {
        try {
            const postId = context.params.postId
            const data = {
                timestamp: post.timestamp,
                title: post.title,
                pic: post.pic,
                user: post.user,
                score: 0
            }
            await db.doc(`topics/${post.usertopic.id}/posts/${postId}`).set(data, merge)
            console.log(`succeed add post data to its topic's subcollection | postId: ${context.params.postId}`)
            await calculateUserTopTopic()
        } catch (err) {
            console.log(`failed to add post data to its tipic's subcollection | postId: ${context.params.postId} | ${err}`)
        }

        async function calculateUserTopTopic() {
            try {
                const topTopic = {
                    id: "",
                    title: "",
                    total_posts: 0
                }
                const topicsSnapshot = await db.collection('topics').get()
                topicsSnapshot.forEach(async doc => {
                    const postsSnapshot = await doc.ref.collection('posts').where('user.id', '==', post.user.id).get()
                    if (postsSnapshot.size > topTopic.total_posts) {
                        topTopic.id = doc.id
                        topTopic.total_posts = postsSnapshot.size
                        const topic = doc.data()
                        if (topic)
                            topTopic.title = topic.title
                    }
                })
                if (topTopic.id !== "")
                    await db.doc(`users/${post.user.id}`).set({ top_topic: topTopic.title }, merge)
                console.log(`succeed to calculate user's top topic | top: ${topTopic.title}`)
            } catch (err) {
                console.log(`failed to calculate user's top topic | ${err}`)
            }
        }

    }

    async function addUserDataToTopic() {
        try {
            const snapshot = await db.doc(`users/${post.user.id}`).get()
            const user = snapshot.data()
            if (user) {
                const data = {
                    name: user.name,
                    pic: user.pic,
                    top_topic: user.top_topic,
                    subscribers: user.subscribers
                }
                await db.doc(`topics/${post.topic.id}/users/${post.user.id}`).set(data, merge)
            }
            console.log(`succeed to add user data to its topic's subcollection | userId: ${post.user.id}`)
        } catch (err) {
            console.log(`failed to add user data to its topic's subcollection | userId: ${post.user.id} | ${err}`)
        }
    }

    async function updateTopicPosts() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`topics/${post.topic.id}`)
                const snapshot = await t.get(ref)
                const topic = snapshot.data()
                if (topic)
                    await t.update(ref, { posts: topic.posts + 1 })
            })
            console.log(`succeed to update topic's posts | topicId: ${post.topic.id}`)
        } catch (err) {
            console.log(`failed to update topic's posts | topicId: ${post.topic.id} | ${err}`)
        }
    }

    async function updateTopicUsers() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`topics/${post.topic.id}`)
                const snapshot = await t.get(ref)
                const topic = snapshot.data()
                if (topic)
                    await t.update(ref, { users: topic.users + 1 })
            })
            console.log(`succeed to update topic's users | topicId: ${post.topic.id}`)
        } catch (err) {
            console.log(`failed to update topic's users | topicId: ${post.topic.id} | ${err}`)
        }
    }

    async function updateUserPosts() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`topics/${post.user.id}`)
                const snapshot = await t.get(ref)
                const user = snapshot.data()
                if (user)
                    await t.update(ref, { posts: user.posts + 1 })
            })
            console.log(`succeed to update user's posts | userId: ${post.user.id}`)
        } catch (err) {
            console.log(`failed to update user's posts | userId: ${post.user.id} | ${err}`)
        }
    }

    async function createFeedEntryForEachSubscriber() {
        try {
            const feedEntry: FirebaseFirestore.DocumentData = {
                title: post.title,
                pic: post.pic,
                timestamp: post.timestamp,
                user: post.user,
                score: 0
            }
            const snapshot = await db.collection(`users/${post.user.id}/subscribers`).get()
            const batch = db.batch()
            snapshot.forEach(doc => {
                const ref = db.doc(`feeds/${doc.id}/posts/${context.params.postId}`)
                batch.set(ref, feedEntry, merge)
            })
            await batch.commit()
            console.log(`succeed to create feed entries | postId: ${context.params.postId}`)
        } catch (err) {
            console.log(`failed to create feed entries | postId: ${context.params.postId} | ${err}`)
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
        await db.doc(`topics/${context.params.topicId}`).set(data, merge)
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
        await db.doc(`users/${user.uid}`).set(data, merge)
        console.log(`succeed to initialize user | userId: ${user.uid}`)
        await Promise.all([
            createFeedToNewUser(),
            updateLastSeen(user.uid)
        ])
    } catch (err) {
        console.log(`failed to initialize user | userId: ${user.uid} | ${err}`)
    }

    async function createFeedToNewUser() {
        try {
            const snapshot = await db.collection('posts').orderBy('score', 'desc').limit(20).get()
            const batch = db.batch()
            snapshot.forEach(doc => {
                const post = doc.data()
                if (post) {
                    const feedEntry = {
                        title: post.title,
                        pic: post.pic,
                        timestamp: post.timestamp,
                        user: post.user,
                        score: post.score
                    }
                    const ref = db.doc(`feeds/${user.uid}/posts/${doc.id}`)
                    batch.set(ref, feedEntry)
                }
            })
            await batch.commit()
            console.log(`succeed to create feed to new user | userId: ${user.uid}`)
        } catch (err) {
            console.log(`failed to create feed to new user | userId: ${user.uid} | ${err}`)
        }
    }

}

export async function markInactiveUsers() {
    try {
        const oneDay = 60 * 60 * 24
        const oneWeek = 7 * oneDay
        const oneWeekAgo = Timestamp.now().seconds - oneWeek
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

    async function deleteFeedEntriesForInactiveUser() {
        // try {
            // this function has some kind of special code for me
            // it has two levels of promises L1 and L2
            // when i execute in parallel promises from level 1
            // it is actually executing in parallel every single promise of level 2
        //     const snapshot = await db.collection('users').where('active', '==', false).get()
        //     const promisesL1: (() => Promise<FirebaseFirestore.WriteResult[]>)[] = []
        //     snapshot.forEach(docL1 => {
        //         const user = docL1.data()
        //         if (user) {
        //             const promise = async () => {
        //                 const feedSnapshot = await db.collection('feeds').where('subscriber.id', '==', docL1.id).get()
        //                 const promisesL2: Promise<FirebaseFirestore.WriteResult>[] = []
        //                 feedSnapshot.forEach(docL2 => promisesL2.push(docL2.ref.delete()))
        //                 return Promise.all(promisesL2)
        //             }
        //             promisesL1.push(promise)
        //         }
        //     })
        //     await Promise.all(promisesL1)
        //     console.log(`succeed to delete feed entries for each inactive user | total: ${1}`)
        // } catch (err) {
        //     console.log(`failed to delete feed entries for each inactive user | ${err}`)
        // }
    }

}

async function calculatePostScore(postId: string) {
    try {
        let score = 0
        const ref = db.doc(`posts/${postId}`)
        await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(ref)
            const post = snapshot.data()
            if (post) {
                const timestamp: FirebaseFirestore.Timestamp = post.timestamp
                score = getFactor(10, post.readings)
                    + getFactor(10, post.bookmarks)
                    + getFactor(10, post.shares)
                    + getFactor(20, post.rating)
                    - getFactor(50, timestamp.seconds)
                await transaction.update(ref, { score: score})
            }
        })
        console.log(`succeed to calculate post's score | postId: ${postId}`)
        await propagatePostScore(score)
    } catch (err) {
        console.log(`failed to calculate post's score | postId: ${postId} | ${err}`)
    }
    
    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

    async function propagatePostScore(score: number) {
        try {
            await Promise.all([
                update('posts'),
                update('bookmarks'),
                update('readings'),
                update('bookmarks'),
                update('ratings'),
                update('shares')
            ])
            console.log(`succeed to propagate post's score | ${score}`)
        } catch (err) {
            console.log(`failed to propagate post's score | ${err}`)
        }

        async function update(collectionName: string) {
            const snapshot = await db.collectionGroup(collectionName).get()
            const batch = db.batch()
            snapshot.forEach(doc => {
                if (doc.id === postId)
                    batch.set(doc.ref, { score: score }, merge)
            })
            await batch.commit()
        }

    }

}

async function calculateTopicScore(topicId: string) {
    try {
        await db.runTransaction(async transaction => {
            const ref = db.doc(`topics/${topicId}`)
            const snapshot = await transaction.get(ref)
            const topic = snapshot.data()
            if (topic){
                const score: number = getFactor(25, topic.posts)
                    + getFactor(25, topic.users)
                    + getFactor(50, topic.readings)
                await transaction.update(ref, { score: score })
            }
        })
        console.log(`succeed to calculate topic's score`)
    } catch (err) {
        console.log(`failed to calculate topic's score | ${err}`)
    }

    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
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
        const batch = db.batch()
        let ref = db.doc(`sessions/${userId}`)
        batch.set(ref, data, merge)
        ref = db.doc(`users/${userId}`)
        batch.set(ref, { active: true }, merge)
        await batch.commit()
        console.log(`succeed to update user's last seen | userId: ${userId}`)
    } catch (err) {
        console.log(`failed to update user's last seen | userId: ${userId} | ${err}`)
    }
}

async function propagateUserUpdates(userId: string) {
    try {
        const snapshot = await db.doc(`users/${userId}`).get()
        const user = snapshot.data()
        if (user) {
            const data = {
                subscribers: user.subscribers,
                subscriptions: user.subscriptions,
                top_topic: user.top_topic
            }
            await Promise.all([
                update(data, 'subscriptions'),
                update(data, 'subscribers'),
                update(data, 'users'),
                update(data, 'readings'),
                update(data, 'bookmarks'),
                update(data, 'ratings'),
                update(data, 'shares')
            ])
        }   
        console.log(`succeed to propagate user's updates | userId: ${userId}`)
    } catch (err) {
        console.log(`failed to propagate user's updates | userId: ${userId} | ${err}`)
    }

    async function update(data: any, collectionName: string) {
        const snapshot = await db.collectionGroup(collectionName).get()
        const batch = db.batch()
        snapshot.forEach(doc => {
            if (doc.id === userId)
                batch.set(doc.ref, data, merge)
        })
        await batch.commit()
    }

}