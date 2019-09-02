/*
 *    Copyright 2019 Horácio Flávio Comé Júnior
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and limitations
 *    under the License.
 */

import * as functions from 'firebase-functions'
import * as utils from './utils'

export const onSubscriberCreated = functions.firestore
    .document('users/{userId}/subscribers/{subscriberId}')
    .onCreate((snapshot, context) => {
        const userId = context.params.userId
        const subscriberId = context.params.subscriberId
        const subscriber = snapshot.data()
        if (subscriber)
            return utils.notifySubscribedUser(userId, subscriberId, subscriber)
        return
    })

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

export const onReadingCreated = functions.firestore
    .document('users/{userId}/readings/{postId}')
    .onWrite((_, context) => {
        const postId = context.params.postId
        return utils.calculatePostScore(postId)
    })

export const onShareCreated = functions.firestore
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