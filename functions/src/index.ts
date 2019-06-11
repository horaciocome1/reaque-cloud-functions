import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as notifications from './utils/notifications'
import * as counters from './utils/counters'
import * as utils from './utils'
import * as accounts from './utils/accounts'
import * as posts from './utils/posts'
import * as favorites from './utils/favorites'

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
                utils.countTopicUsers(context, post)
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



exports.onPostCreated = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    const post = snap.data()
    if (post) {
        const promises = [
            posts.addPostTopicToUser(context, post),
            notifications.buildFavoriteHasNewPostNotification(context, post),
            counters.updateUserPostsCount(context, post),
            counters.updateTopicPostsCount(context, post),
            counters.updateTopicUsersCount(context, post)
        ]
        await Promise.all(promises)
    }
})

exports.onPostDeleted = functions.firestore.document('posts/{postId}').onDelete(async (snap, context) => {
    const post = snap.data()
    if (post) {
        const promises = [
            notifications.wipeFavoriteHasNewPostNotifications(context),
            counters.updateUserPostsCount(context, post),
            counters.updateTopicPostsCount(context, post),
            counters.updateTopicUsersCount(context, post)
        ]
        await Promise.all(promises)
    }
})

exports.onUserUpdated = functions.firestore.document('users/{userId}').onUpdate(async (snap, context) => {
    const before = snap.before.data()
    const after = snap.after.data()
    if (before && after) {
        const promises = []
        if (utils.changeOcurred(before.favorite_for, after.favorite_for))
            promises.push(counters.updateUserFavoriteForCount(context, after))
        if (utils.changeOcurred(before.bio, after.bio) || utils.changeOcurred(before.address, after.address))
            promises.push(notifications.buildFavoriteUpdatedProfileNotification(context, before, after))
        await Promise.all(promises)
    }
})

exports.onUserDeleted = functions.firestore.document('users/{userId}').onDelete(async (snap, context) => {
    const user = snap.data()
    if (user) {
        const promises = [
            notifications.wipeFavoriteUpdatedProfileNotifications(context),
            posts.wipeDeletedUserPosts(context, user)
        ]
        await Promise.all(promises)
    }
})

exports.onAddToFavoritesRequestCreated = functions.firestore.document('add_to_favorites_requests/{requestId}').onCreate(async (snap, context) => {
    const request = snap.data()
    if(request) await favorites.addToFavorites(context, request)
})

exports.onRemoveFromFavoritesRequestCreated = functions.firestore.document('remove_from_favorites_requests/{requestId}').onCreate(async (snap, context) => {
    const request = snap.data()
    if(request) await favorites.removeFromFavorites(context, request)
})

exports.onUserAccountCreated = functions.auth.user().onCreate(async (user, _) => {
    const promises = [
        accounts.saveUserData(user),
        notifications.subscribeUserToWelcomeNotification(user)
    ]
    await Promise.all(promises)
})

exports.onUserAccountDeleted = functions.auth.user().onDelete(async (user, _) => {
    const promises = [
        accounts.deleteUserData(user),
        notifications.unSubscribeUserFromWelcomeNotification(user)
    ]
    await Promise.all(promises)
})