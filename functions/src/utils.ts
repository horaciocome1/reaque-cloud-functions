import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

admin.initializeApp()

const db = admin.firestore()

const merge = { merge: true }

export async function calculateRating(context: functions.EventContext) {
    try {
        await db.runTransaction(async t => {
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
        console.log(`succeed to calculate rating | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to calculate rating | postId: ${context.params.postId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

export async function initializePost(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    
    try {
        await Promise.all([
            createFeedEntryForEachSubscriber(),
            calculateUserTopTopic()
        ])
        console.log(`succeed to initialize post | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to initialize post | postId: ${context.params.postId} | ${err}`)        
    }

    async function calculateUserTopTopic() {
        try {
            const topTopic = {
                id: "",
                title: "",
                total_posts: 0
            }
            await db.runTransaction(async t => {
                const ref1 = db.collection('topics')
                const topicsSnapshot = await t.get(ref1)
                topicsSnapshot.forEach(async doc => {
                    const ref2 = doc.ref.collection('posts').where('user.id', '==', post.user.id)
                    const postsSnapshot = await t.get(ref2)
                    if (postsSnapshot.size > topTopic.total_posts) {
                        topTopic.id = doc.id
                        topTopic.total_posts = postsSnapshot.size
                        const topic = doc.data()
                        if (topic)
                            topTopic.title = topic.title
                    }
                })
                if (topTopic.total_posts !== 0) {
                    const ref3 = db.doc(`users/${post.user.id}`)
                    await t.set(ref3, { top_topic: topTopic.title })
                }   
            })
            console.log(`succeed to calculate user's top topic | top: ${topTopic}`)
        } catch (err) {
            console.log(`failed to calculate user's top topic | ${err}`)
        }
    }

    async function createFeedEntryForEachSubscriber() {
        try {
            const feedEntry = {
                title: post.title,
                pic: post.pic,
                timestamp: post.timestamp,
                user: post.user,
                score: post.score
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
            subscriptions: 0,
            subscribers: 0,
            posts: 0,
            score: 0
        }
        await db.doc(`users/${user.uid}`).set(data, merge)
        console.log(`succeed to initialize user | userId: ${user.uid}`)
        await createFeedToNewUser()
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

export async function handlingUpdatingEachPostScore() {

    try {
        const snapshot = await db.collection('posts').get()
        snapshot.forEach(doc => calculatePostScore(doc.id))
        console.log(`succeed to handle updating each post score | ${snapshot.size}`)
        return true
    } catch (err) {
        console.log(`failed to handle updating each post score | ${err}`)
        return false
    }

    async function calculatePostScore(postId: string) {
        try {
            let score = 0
            await db.runTransaction(async transaction => {
                const ref = db.doc(`posts/${postId}`)
                const snapshot = await transaction.get(ref)
                const post = snapshot.data()
                if (post) {
                    const timestamp: FirebaseFirestore.Timestamp = post.timestamp
                    score = getFactor(90, timestamp.seconds)
                        + getFactor(4, post.readings)
                        + getFactor(1, post.bookmarks)
                        + getFactor(1, post.shares)
                        + getFactor(4, post.rating)
                }
                await transaction.update(ref, { score: score })
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
                try {
                    const snapshot = await db.collectionGroup(collectionName).get()
                    const batch = db.batch()
                    snapshot.forEach(doc => {
                        if (doc.id === postId)
                            batch.set(doc.ref, { score: score }, merge)
                    })
                    await batch.commit()
                    console.log(`succeed to propagate post's updates to collection | collectionName: ${collectionName}`)
                } catch (err) {
                    console.log(`failed to propagate post's updates to collection | collectionName: ${collectionName} | ${err}`)        
                }
            }
    
        }
    
    }

}

export async function handlingUpdatingEachTopicScore() {

    try {
        const snapshot = await db.collection('topics').where('posts', '>', 0).get()
        snapshot.forEach(doc => calculateTopicScore(doc.id))
        console.log(`succeed to handle updating each topic score | ${snapshot.size}`)
        return true
    } catch (err) {
        console.log(`failed to handle updating each topic score | ${err}`)
        return false
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
                const s = sum / snapshot.size
                t.update(ref, { score: s })
            })
            console.log(`succeed to calculate topic's score | ${topicId}`)
        } catch (err) {
            console.log(`failed to calculate topic's score | ${topicId} | ${err}`)
        }

    }

}

export async function handlingUpdatingEachUserScore() {

    try {
        const snapshot = await db.collection('users').where('posts', '>', 0).get()
        snapshot.forEach(doc => calculateUserScore(doc.id))
        console.log(`succeed to handle updating each topic score | ${snapshot.size}`)
        return true
    } catch (err) {
        console.log(`failed to handle updating each topic score | ${err}`)
        return false
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
                const s = sum / snapshot.size
                t.update(ref, { score: s })
            })
            console.log(`succeed to calculate user's score | ${userId}`)
            await propagateUserUpdates()
        } catch (err) {
            console.log(`failed to calculate user's score | ${userId} | ${err}`)
        }

        async function propagateUserUpdates() {
        
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
                try {
                    const snapshot = await db.collectionGroup(collectionName).get()
                    const batch = db.batch()
                    snapshot.forEach(doc => {
                        if (doc.id === userId)
                            batch.set(doc.ref, data, merge)
                    })
                    await batch.commit()
                    console.log(`succeed to propagate user's updates to collection | collectionName: ${collectionName}`)
                } catch (err) {
                    console.log(`failed to propagate user's updates to collection | collectionName: ${collectionName} | ${err}`)        
                }
            }
        
        }

    }

}