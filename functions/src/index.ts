import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as notifications from './utils/notifications'
import * as counters from './utils/counters'
import * as utils from './utils/general'
import * as accounts from './utils/accounts'
import * as posts from './utils/posts'
import * as favorites from './utils/favorites'

admin.initializeApp()

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