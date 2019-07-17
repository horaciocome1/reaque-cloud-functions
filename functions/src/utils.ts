import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

admin.initializeApp()

const db = admin.firestore()

const merge = { merge: true }

export async function handleSubscription(context: functions.EventContext) {
    await Promise.all([
        updateSubscriptions(),
        updateLastSeen(context.params.userId)
    ])
    await updateSubscribers()

    async function updateSubscriptions() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`users/${context.params.userId}`)
                const snapshot = await t.get(ref.collection('subscriptions'))
                await t.update(ref, { subscriptions: snapshot.size })
            })
            console.log(`succeed to update subscriptions | userId: ${context.params.userId}`)
        } catch (err) {
            console.log(`failed to update subscriptions | userId: ${context.params.userId} | ${err}`)
        }
    }

    async function updateSubscribers() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`users/${context.params.subscriptionId}`)
                const snapshot = await t.get(ref.collection('subscribers'))
                await t.update(ref, { subscribers: snapshot.size })
            })
            console.log(`succeed to update subscribers | userId: ${context.params.subscriptionId}`)
            await propagateUserUpdates(context.params.subscriptionId)
        } catch (err) {
            console.log(`failed to update subscribers | userId: ${context.params.subscriptionId} | ${err}`)
        }
    }

}

export async function handleBookmark(context: functions.EventContext) {
    await Promise.all([
        updateLastSeen(context.params.userId),
        updateBookmarks()
    ])

    async function updateBookmarks() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`posts/${context.params.postId}`)
                const snapshot = await t.get(ref.collection('bookmarks'))
                await t.update(ref, { bookmarks: snapshot.size })
            })
            console.log(`succeed to update bookmarks | postId: ${context.params.postId}`)
            await calculatePostScore(context.params.postId)
        } catch (err) {
            console.log(`failed to update bookmarks | postId: ${context.params.postId} | ${err}`)
        }
    }

}

export async function handleReading(context: functions.EventContext) {
    await Promise.all([
        updateReadings(),
        updateLastSeen(context.params.userId)
    ])

    async function updateReadings() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`posts/${context.params.postId}`)
            const snapshot = await t.get(ref.collection('readings'))
            await t.update(ref, { readings: snapshot.size })
            })
            console.log(`succeed to update readings | postId: ${context.params.postId}`)
            await calculatePostScore(context.params.postId)
        } catch (err) {
            console.log(`failed to update readings | postId: ${context.params.postId} | ${err}`)
        }
    }

}

export async function handleShare(context: functions.EventContext) {
    await Promise.all([
        updateShares(),
        updateLastSeen(context.params.userId)
    ])

    async function updateShares() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`posts/${context.params.postId}`)
            const snapshot = await t.get(ref.collection('shares'))
            await t.update(ref, { shares: snapshot.size })
            })
            console.log(`succeed to update shares | postId: ${context.params.postId}`)
            await calculatePostScore(context.params.postId)
        } catch (err) {
            console.log(`failed to count shares | postId: ${context.params.postId} | ${err}`)
        }
    }

}

export async function calculateRating(context: functions.EventContext) {
    try {
        const transaction = db.runTransaction(async t => {
            const ref = db.collection(`posts/${context.params.postId}/ratings`)
            const snapshot = await t.get(ref)
            let sum = 0
            snapshot.forEach(doc => {
                const data = doc.data()
                if (data)
                    sum += data.value
            })
            const postRating = sum / snapshot.size
            const roundedRating = round(postRating, 1) // 1 decimal, uma casa decimal
            const ref2 = db.doc(`posts/${context.params.postId}`)
            await t.update(ref2, { rating: roundedRating })
        })
        await Promise.all([
            transaction,
            updateLastSeen(context.params.userId)
        ])
        console.log(`succeed to calculate rating | postId: ${context.params.postId}`)
        await calculatePostScore(context.params.postId)
    } catch (err) {
        console.log(`failed to calculate rating | postId: ${context.params.postId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

export async function initializePost(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    await Promise.all([
        addPostDataToUser(),
        addPostDataToTopic(),
        addUserDataToTopic(),
        createFeedEntryForEachSubscriber(),
        updateLastSeen(post.user.id)
    ])
    await Promise.all([
        updateTopicPosts(),
        updateTopicUsers(),
        updateUserPosts(),
        calculateTopicScore(post.topic.id),
        calculateUserScore(post.user.id)
    ])

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
            await db.doc(`topics/${post.topic.id}/posts/${postId}`).set(data, merge)
            console.log(`succeed add post data to its topic's subcollection | postId: ${context.params.postId}`)
            await calculateUserTopTopic()
        } catch (err) {
            console.log(`failed to add post data to its topic's subcollection | postId: ${context.params.postId} | ${err}`)
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
                const snapshot = await t.get(ref.collection('posts'))
                await t.update(ref, { posts: snapshot.size })
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
                const snapshot = await t.get(ref.collection('users'))
                await t.update(ref, { users: snapshot.size })
            })
            console.log(`succeed to update topic's users | topicId: ${post.topic.id}`)
        } catch (err) {
            console.log(`failed to update topic's users | topicId: ${post.topic.id} | ${err}`)
        }
    }

    async function updateUserPosts() {
        try {
            await db.runTransaction(async t => {
                const ref = db.doc(`users/${post.user.id}`)
                const snapshot = await t.get(ref.collection('posts'))
                await t.update(ref, { posts: snapshot.size })
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
                const ref = db.doc(`users/${doc.id}/feed/${context.params.postId}`)
                batch.set(ref, feedEntry, merge)
            })
            await batch.commit()
            console.log(`succeed to create feed entries | postId: ${context.params.postId}`)
        } catch (err) {
            console.log(`failed to create feed entries | postId: ${context.params.postId} | ${err}`)
        }
    }

}

export async function initializeUser(user: admin.auth.UserRecord) {
    try {
        const data = {
            name: user.displayName,
            email: user.email,
            pic: user.photoURL,
            since: Timestamp.now(),
            top_topic: '',
            subscribers: 0,
            subscriptions: 0,
            posts: 0,
            score: 0
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
                    const ref = db.doc(`users/${user.uid}/feed/${doc.id}`)
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

async function calculatePostScore(postId: string) {
    try {
        const promises = []
        let score = 0
        await db.runTransaction(async transaction => {
            const ref = db.doc(`posts/${postId}`)
            const snapshot = await transaction.get(ref)
            const post = snapshot.data()
            if (post) {
                const timestamp: FirebaseFirestore.Timestamp = post.timestamp
                score = getFactor(80, timestamp.seconds)
                    + getFactor(8, post.readings)
                    + getFactor(2, post.bookmarks)
                    + getFactor(2, post.shares)
                    + getFactor(8, post.rating) 
                await transaction.update(ref, { score: score})
                promises.push(calculateTopicScore(post.topic.id))
                promises.push(calculateUserScore(post.user.id))
            }
        })
        console.log(`succeed to calculate post's score | postId: ${postId}`)
        promises.push(propagatePostScore(score))
        await Promise.all(promises)
    } catch (err) {
        console.log(`failed to calculate post's score | postId: ${postId} | ${err}`)
    }
    
    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

    async function propagatePostScore(score: number): Promise<void> {
        try {
            await Promise.all([
                update('posts'),
                update('bookmarks'),
                update('feed')
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
        await db.runTransaction(async t => {
            const ref = db.doc(`topics/${topicId}`)
            const snapshot = await t.get(ref.collection('posts'))
            let sum = 0
            snapshot.forEach(doc => {
                const post = doc.data()
                if (post)
                    sum += post.score
            })
            const score = sum / snapshot.size
            t.update(ref, { score: score})
        })
        console.log(`succeed to calculate topic's score | ${topicId}`)
    } catch (err) {
        console.log(`failed to calculate topic's score | ${topicId} | ${err}`)
    }

}

async function calculateUserScore(userId: string) {
    try {
        await db.runTransaction(async t => {
            const ref = db.doc(`users/${userId}`)
            const snapshot = await t.get(ref.collection('posts'))
            let sum = 0
            snapshot.forEach(doc => {
                const post = doc.data()
                if (post)
                    sum += post.score
            })
            const score = sum / snapshot.size
            t.update(ref, { score: score})
        })
        console.log(`succeed to calculate user's score | ${userId}`)
        await propagateUserUpdates(userId)
    } catch (err) {
        console.log(`failed to calculate user's score | ${userId} | ${err}`)
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
                top_topic: user.top_topic,
                score: user.score
            }
            await Promise.all([
                update(data, 'subscriptions'),
                update(data, 'subscribers'),
                update(data, 'users')
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