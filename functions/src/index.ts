import * as functions from 'firebase-functions'
import * as utils from './utils'

export const onRatingWritten = functions.firestore
    .document('posts/{postId}/ratings/{userId}')
    .onWrite(async (_, context) => {
        const postId = context.params.postId
        await utils.calculateAverageRating(postId)
        return utils.calculatePostScore(postId)
    })

export const onBookmarkCreated = functions.firestore
    .document('users/{userId}/bookmarks/{postId}')
    .onCreate((_, context) => {
        const postId = context.params.postId
        return utils.calculatePostScore(postId)
    })

export const onBookmarkDeleted = functions.firestore
    .document('users/{userId}/bookmarks/{postId}')
    .onDelete((_, context) => {
        const postId = context.params.postId
        return utils.calculatePostScore(postId)
    })

export const onReadingWritten = functions.firestore
    .document('users/{userId}/readings/{postId}')
    .onWrite((_, context) => {
        const postId = context.params.postId
        return utils.calculatePostScore(postId)
    })

export const onShareWritten = functions.firestore
    .document('users/{userId}/shares/{postId}')
    .onWrite((_, context) => {
        const postId = context.params.postId
        return utils.calculatePostScore(postId)
    })

export const onPostCreated = functions.firestore
    .document('posts/{postId}')
    .onCreate((snapshot, context) => {
        const post = snapshot.data()
        if (post) {
            const postId = context.params.postId
            return utils.createFeedEntryForEachSubscriber(postId, post)
        }
        return
    })

export const onTopicPostWritten = functions.firestore
    .document('topics/{topicId}/posts/{postId}')
    .onWrite((_, context) => {
        const topicId = context.params.topicId
        return utils.calculateTopicAverageScore(topicId)
    })

export const onUserPostWritten = functions.firestore
    .document('users/{userId}/posts/{postId}')
    .onWrite(async (_, context) => {
        const userId = context.params.userId
        await utils.calculateUserAverageScore(userId)
        return utils.propagateUserUpdates(userId)
    })

export const onAccountCreated = functions.auth.user()
    .onCreate((user, _) => utils.initializeUser(user))