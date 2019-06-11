import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore';

export async function countSubscribers(context: functions.EventContext, subscription: FirebaseFirestore.DocumentData) {
    try {
        const subscribedId: string = subscription.subscribed.id
        const db = admin.firestore()
        const subscriptionsSnapshot = await db.collection('subscriptions').where('subscribed.id', '==', subscribedId).get()
        await db.doc(`users/${subscribedId}`).set({ subscribers: subscriptionsSnapshot.size }, { merge: true })
        console.log(`succeed to count subscribers | subscriptionId: ${context.params.subscriptionId}`)
    } catch (err) {
        console.log(`failed to count subscribers | subscriptionId: ${context.params.subscriptionId} | ${err}`)
    }
}

export async function countSubscriptions(context: functions.EventContext, subscription: FirebaseFirestore.DocumentData) {
    try {
        const subscriberId: string = subscription.subscriber.id
        const db = admin.firestore()
        const subscriptionsSnapshot = await db.collection('subscriptions').where('subscriber.id', '==', subscriberId).get()
        await db.doc(`users/${subscriberId}`).set({ subscriptions: subscriptionsSnapshot.size }, { merge: true })
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

export async function countReadings(context: functions.EventContext, reading: FirebaseFirestore.DocumentData) {
    try {
        const postId: string = reading.post.id
        const db = admin.firestore()
        const readingsSnapshot = await db.collection('readings').where('post.id', '==', postId).get()
        await db.doc(`posts/${postId}`).set({ readings: readingsSnapshot.size }, { merge: true })
        console.log(`succeed to count readings | readingId: ${context.params.readingId}`)
    } catch (err) {
        console.log(`failed to count readings | readingId: ${context.params.readingId} | ${err}`)
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

export async function updateRating(context: functions.EventContext, rating: FirebaseFirestore.DocumentData) {
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
            shares: 0
        }
        const db = admin.firestore()
        await db.doc(`posts/${context.params.postId}`).set(data, { merge: true })
        console.log(`succeed to initialize post | postId: ${context.params.postId}`)
    } catch (err) {
        console.log(`failed to initialize post | postId: ${context.params.postId} | ${err}`)
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