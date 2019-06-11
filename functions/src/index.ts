import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as utils from './utils'

admin.initializeApp()

exports.onSubscriptionCreated = functions.firestore.document('subscriptions/subscriptionId').onCreate(
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

exports.onSubscriptionDeleted = functions.firestore.document('subscriptions/subscriptionId').onDelete(
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

exports.onBookmarkCreated = functions.firestore.document('bookmarks/bookmarkId').onCreate(
    async (snapshot, context) => {
        const bookmark = snapshot.data()
        if (bookmark) await utils.countBookmarks(context, bookmark)
    }
)

exports.onBookmarkDeleted = functions.firestore.document('bookmarks/bookmarkId').onDelete(
    async (snapshot, context) => {
        const bookmark = snapshot.data()
        if (bookmark) await utils.countBookmarks(context, bookmark)
    }
)

exports.onReadingCreated = functions.firestore.document('readings/readingId').onCreate(
    async (snapshot, context) => {
        const reading = snapshot.data()
        if (reading) await utils.countReadings(context, reading)
    }
)

exports.onShareCreated = functions.firestore.document('shares/shareId').onCreate(
    async (snapshot, context) => {
        const share = snapshot.data()
        if (share) await utils.countReadings(context, share)
    }
)

exports.onRatingCreated = functions.firestore.document('ratings/ratingId').onCreate(
    async (snapshot, context) => {
        const rating = snapshot.data()
        if (rating) await utils.updateRating(context, rating)
    }
)

exports.onRatingUpdated = functions.firestore.document('ratings/ratingId').onUpdate(
    async (snapshot, context) => {
        const rating = snapshot.after.data()
        if (rating) await utils.updateRating(context, rating)
    }
)

exports.onPostCreated = functions.firestore.document('posts/postId').onCreate(
    async (snapshot, context) => {
        const post = snapshot.data()
        if (post) {
            const promises = [
                utils.initializePost(context),
                utils.countTopicPosts(context, post),
                utils.countUserPosts(context, post),
                utils.countTopicUsers(context, post),
                utils.createFeedEntryForEachSubscriber(context, post)
            ]
            await Promise.all(promises)
        }
    }
)

exports.onTopicCreated = functions.firestore.document('topic/topicsId').onCreate(
    async (_, context) => utils.initializeTopic(context)
)

exports.onAccountCreated = functions.auth.user().onCreate(
    async (user, _) => await utils.initializeUser(user)
)