import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as utils from './utils'

admin.initializeApp()

export const onSubscriptionCreated = functions.firestore.document('subscriptions/subscriptionId').onCreate(
    async (snapshot, context) => {
        const subscription = snapshot.data()
        if (subscription) {
            const promises = [
                utils.countSubscribers(context, subscription),
                utils.countSubscriptions(context, subscription)
            ]
            await Promise.all(promises)
        }
    }
)

export const onSubscriptionDeleted = functions.firestore.document('subscriptions/subscriptionId').onDelete(
    async (snapshot, context) => {
        const subscription = snapshot.data()
        if (subscription) {
            const promises = [
                utils.countSubscribers(context, subscription),
                utils.countSubscriptions(context, subscription)
            ]
            await Promise.all(promises)
        }
    }
)

export const onBookmarkCreated = functions.firestore.document('bookmarks/bookmarkId').onCreate(
    async (snapshot, context) => {
        const bookmark = snapshot.data()
        if (bookmark) 
            await utils.countBookmarks(context, bookmark)
    }
)
export const onBookmarkDeleted = functions.firestore.document('bookmarks/bookmarkId').onDelete(
    async (snapshot, context) => {
        const bookmark = snapshot.data()
        if (bookmark)
            await utils.countBookmarks(context, bookmark)
    }
)

export const onReadingCreated = functions.firestore.document('readings/readingId').onCreate(
    async (snapshot, context) => {
        const reading = snapshot.data()
        if (reading) {
            const promises = [
                utils.countPostReadings(context, reading),
                utils.countTopicReadings(context, reading)
            ]
            await Promise.all(promises)
        }
    }
)

export const onShareCreated = functions.firestore.document('shares/shareId').onCreate(
    async (snapshot, context) => {
        const share = snapshot.data()
        if (share)
            await utils.countShares(context, share)
    }
)

export const onRatingCreated = functions.firestore.document('ratings/ratingId').onCreate(
    async (snapshot, context) => {
        const rating = snapshot.data()
        if (rating)
            await utils.calculateRating(context, rating)
    }
)

export const onRatingUpdated = functions.firestore.document('ratings/ratingId').onUpdate(
    async (snapshot, context) => {
        const rating = snapshot.after.data()
        if (rating)
            await utils.calculateRating(context, rating)
    }
)

export const onPostCreated = functions.firestore.document('posts/postId').onCreate(
    async (snapshot, context) => {
        const post = snapshot.data()
        if (post) await utils.initializePost(context, post)
    }
)

export const onTopicCreated = functions.firestore.document('topic/topicsId').onCreate(
    async (_, context) => utils.initializeTopic(context)
)

export const onFeedRequestCreated = functions.firestore.document('feed_requests/requestId').onCreate(
    async (snapshot, context) => {
        const request = snapshot.data()
        if (request) 
            await utils.createFeed(context, request)
    }
)

export const onAccountCreated = functions.auth.user().onCreate(
    async (user, _) => await utils.initializeUser(user)
)