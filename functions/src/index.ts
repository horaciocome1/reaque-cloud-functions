import * as functions from 'firebase-functions'
import * as utils from './utils'

export const onSubscriptionCreated = functions.firestore.document('users/{userId}/subscriptions/{subscriptionId}').onCreate(
    async (_, context) => await utils.handleSubscription(context, true)
)

export const onSubscriptionDeleted = functions.firestore.document('users/{userId}/subscriptions/{subscriptionId}').onDelete(
    async (_, context) => await utils.handleSubscription(context, false)
)

export const onBookmarkCreated = functions.firestore.document('users/{userId}/bookmarks/{bookmarkId}').onCreate(
    async (_, context) => await utils.handleBookmark(context, true)
)

export const onBookmarkDeleted = functions.firestore.document('users/{userId}/bookmarks/{bookmarkId}').onDelete(
    async (_, context) => await utils.handleBookmark(context, false)
)

export const onReadingCreated = functions.firestore.document('users/{userId}/readings/{readingId}').onCreate(
    async (_, context) => await utils.handleReading(context)
)

export const onShareCreated = functions.firestore.document('users/{userId}/shares/{shareId}').onCreate(
    async (_, context) => await utils.handleShare(context)
)

export const onRatingCreated = functions.firestore.document('users/{userId}/ratings/{ratingId}/requests/{requestId}').onCreate(
    async (snapshot, context) => {
        const rating = snapshot.data()
        if (rating)
            await utils.calculateRating(context, rating)
    }
)

export const onPostCreated = functions.firestore.document('posts/{postId}').onCreate(
    async (snapshot, context) => {
        const post = snapshot.data()
        if (post) await utils.initializePost(context, post)
    }
)

export const onAccountCreated = functions.auth.user().onCreate(
    async (user, _) => await utils.initializeUser(user)
)