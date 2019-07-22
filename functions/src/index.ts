import * as functions from 'firebase-functions'
import * as utils from './utils'

export const onSubscriptionCreated = functions.firestore.document('users/{userId}/subscribers/{subscriberId}').onCreate(
    async (_, context) => await utils.propagateUserUpdates(context.params.userId)
)

export const onSubscriptionDeleted = functions.firestore.document('users/{userId}/subscribers/{subscriberId}').onDelete(
    async (_, context) => await utils.propagateUserUpdates(context.params.userId)
)

export const onRatingCreated = functions.firestore.document('posts/{postId}/ratings/{userId}').onCreate(
    async (snapshot, context) => {
        const rating = snapshot.data()
        if (rating)
            await utils.calculateRating(context)
    }
)

export const onRatingUpdated = functions.firestore.document('posts/{postId}/ratings/{userId}').onUpdate(
    async (snapshot, context) => {
        const rating = snapshot.after.data()
        if (rating)
            await utils.calculateRating(context)
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