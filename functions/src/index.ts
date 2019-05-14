import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as notifications from './notifications'
import * as counters from './counters'
import * as utils from './utils'
import { isNullOrUndefined } from 'util';

admin.initializeApp()

exports.onPostCreated = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    console.log('new post detected | ' + context.params.postId)
    const post = snap.data()
    if (post) {
        const promises = []
        promises.push(notifications.buildFavoriteHasNewPostNotification(context, post))        
        promises.push(counters.updateUserPostsCount(context, post))
        promises.push(counters.updateTopicPostsCount(context, post))
        await Promise.all(promises)
    }
})

exports.onPostDeleted = functions.firestore.document('posts/{postId}').onDelete(async (snap, context) => {
    console.log('post delete detected | ' + context.params.postId)
    const post = snap.data()
    if (post) {
        const promises = []
        promises.push(counters.updateUserPostsCount(context, post))
        promises.push(counters.updateTopicPostsCount(context, post))
        promises.push(notifications.wipeFavoriteHasNewPostNotification(context))
        await Promise.all(promises)
    }
})

exports.onUserUpdated = functions.firestore.document('users/{userId}').onUpdate(async (snap, context) => {
    console.log('user update detected | ' + context.params.userId)
    const before = snap.before.data()
    const after = snap.after.data()
    if (before && after) {
        const promises = []
        if (!isNullOrUndefined(before.favorite_for) && !isNullOrUndefined(after.favorite_for) && !utils.isEquivalent(before.favorite_for, after.favorite_for))
            promises.push(counters.updateUserFavoriteForCount(context, after))
        if (before.bio !== after.bio || before.address !== after.address)
            promises.push(notifications.buildFavoriteUpdatedProfileNotification(context, before, after))
        if (promises.length > 0)
            await Promise.all(promises)
    }
})