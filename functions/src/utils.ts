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
        console.log(`failed to count subscribers | subscriptionId: ${context.params.subscriptionId}`)
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