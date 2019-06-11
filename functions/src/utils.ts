import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

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