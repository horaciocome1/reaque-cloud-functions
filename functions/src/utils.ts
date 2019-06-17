import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp, DocumentReference } from '@google-cloud/firestore'
import { isEqual } from "lodash"
import { isNullOrUndefined } from "util"

export async function countSubscribers(context: functions.EventContext, subscription: FirebaseFirestore.DocumentData) {
    try {
        const subscribedId: string = subscription.subscribed.id
        const db = admin.firestore()
        const snapshot = await db.collection('subscriptions').where('subscribed.id', '==', subscribedId).get()
        await db.doc(`users/${subscribedId}`).set({ subscribers: snapshot.size }, { merge: true })
        console.log(`succeed to count subscribers | subscriptionId: ${context.params.subscriptionId}`)
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
    } catch (err) {
        console.log(`failed to count subscriptions | subscriptionId: ${context.params.subscriptionId} | ${err}`)
    }
}

export async function countBookmarks(context: functions.EventContext, bookmark: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = bookmark.post.id
        const db = admin.firestore()
        const bookmarksSnapshot = await db.collection('bookmarks').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ bookmarks: bookmarksSnapshot.size }, { merge: true })
        console.log(`succeed to count bookmarks | bookmarkId: ${context.params.bookmarkId}`)
    } catch (err) {
        console.log(`failed to count bookmarks | bookmarkId: ${context.params.bookmarkId} | ${err}`)
    }
}

export async function countPostReadings(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = reading.post.id
        const db = admin.firestore()
        const readingsSnapshot = await db.collection('readings').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ readings: readingsSnapshot.size }, { merge: true })
        console.log(`succeed to count readings for post | readingId: ${context.params.readingId}`)
    } catch (err) {
        console.log(`failed to count readings for post | readingId: ${context.params.readingId} | ${err}`)
    }
}

export async function countTopicReadings(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        const topicId: string = reading.post.topic.id
        const db = admin.firestore()
        const readingsSnapshot = await db.collection('readings').where('topic.id', '==', topicId).get()
        await db.doc(`topics/${topicId}`).set({ readings: readingsSnapshot.size }, { merge: true })
        console.log(`succeed to count readings for topic | readingId: ${context.params.readingId}`)
    } catch (err) {
        console.log(`failed to count readings for topic | readingId: ${context.params.readingId} | ${err}`)
    }
}

export async function countShares(context: functions.EventContext, share: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = share.post.id
        const db = admin.firestore()
        const sharesSnapshot = await db.collection('shares').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ shares: sharesSnapshot.size }, { merge: true })
        console.log(`succeed to count shares | shareId: ${context.params.shareId}`)
    } catch (err) {
        console.log(`failed to count shares | shareId: ${context.params.shareId} | ${err}`)
    }
}

export async function calculateRating(context: functions.EventContext, rating: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = rating.post.id
        const db = admin.firestore()
        const ratesSnapshot = await db.collection('rating').where('post.id', '==', postId).get()
        let sum = 0
        ratesSnapshot.forEach(doc => {
            const data = doc.data()
            if (data) {
                const value: number = data.value
                sum += value
            }
        })
        const postRating = sum / ratesSnapshot.size
        const roundedRating = round(postRating, 1) // 1 decimal, uma casa decimal
        await db.doc(`posts/${postId}`).set({ rating: roundedRating }, { merge: true })
        console.log(`succeed to update rating | ratingId: ${context.params.ratingId}`)
    } catch (err) {
        console.log(`failed to update rating | ratingId: ${context.params.ratingId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

export async function initializePost(context: functions.EventContext) {
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
    } catch (err) {
        console.log(`failed to initialize post | postId: ${context.params.postId} | ${err}`)
    }
}

export async function createFeedEntryForEachSubscriber(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const userId: string = post.user.id
        const feed: FirebaseFirestore.DocumentData = {
            title: post.title,
            pic: post.pic,
            timestamp: Timestamp.now(),
            user: {
                id: userId,
                name: post.user.name
            },
            content_id: context.params.postId
        }
        const db = admin.firestore()
        const snapshot = await db.collection('subscriptions').where('subscribed.id', '==', userId).get()
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

export async function countTopicPosts(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
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

export async function countUserPosts(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
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

export async function countTopicUsers(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
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

export async function calculatePostScore(context: functions.EventContext, postId: string) {
    try {
        const db = admin.firestore()
        const snapshot = await db.doc(`posts/${postId}`).get()
        const post = snapshot.data()
        if (post) {
            const timestamp: FirebaseFirestore.Timestamp = post.timestamp
            const score = getFactor(50, timestamp.toMillis())
                + getFactor(10, post.readings)
                + getFactor(10, post.bookmarks)
                + getFactor(10, post.shares)
                + getFactor(20, post.rate)
            await db.doc(`posts/${context.params.postId}`).set({score: score}, {merge: true})
            console.log(`succeed to calculate post's score | postId: ${context.params.postId}`)
        }
    } catch (err) {
        console.log(`failed to calculate post's score | postId: ${context.params.postId} | ${err}`)
    }
    
    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

}

export async function calculateTopicPopularity(context: functions.EventContext, postId: string) {
    try {
        const db = admin.firestore()
        const topic = await getTopic()
        if (topic){
            const popularity = getFactor(25, topic.posts)
                + getFactor(25, topic.users)
                + getFactor(50, topic.readings)
            await db.doc(`topics/${context.params.topicId}`).set({ popularity: popularity }, { merge: true })
            console.log(`succeed to calculate topic's score | topicId: ${context.params.topicId}`)
        }
    } catch (err) {
        console.log(`failed to calculate topic's score | topicId: ${context.params.topicId} | ${err}`)
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
        if (post) {
            const topicSnapshot = await db.doc(`topics/${post.topic.id}`).get()
            const topic = topicSnapshot.data()
            if (topic)
                return topic
        }
        return
    }

}

export async function initializeTopic(context: functions.EventContext) {
    try {
        const data = {
            posts: 0,
            users: 0,
            readings: 0,
            popularity: 0
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
    } catch (err) {
        console.log(`failed to initialize user | userId: ${user.uid} | ${err}`)
    }
}

export function changeOcurred(before: any, after: any): boolean {

    const isEquivalent = () => {
        return before && typeof before.isEqual === 'function' ? before.isEqual(after): isEqual(before, after);
    }

    if (!isNullOrUndefined(before) && !isNullOrUndefined(after) && !isEquivalent())
        return true
    return false
}