import * as functions from 'firebase-functions'
import * as utils from './utils'

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
        if (post) await utils.createFeedEntryForEachSubscriber(context, post)
    }
)

export const onAccountCreated = functions.auth.user().onCreate(
    async (user, _) => await utils.initializeUser(user)
)

export const updatingEachPostScore = functions.https.onRequest(async (_, res) => {
        const hasErros = await utils.handlingUpdatingEachPostScore()
        let message = 'updatingEachPostScore: '
        if (hasErros === true)
            message += 'Successful!'
        else
            message += 'We had some errors! Please visit the logs'
        await res.send(message)
})

export const updatingEachTopicScore = functions.https.onRequest(async (_, res) => {
        const hasErros = await utils.handlingUpdatingEachTopicScore()
        let message = 'updatingEachTopicScore: '
        if (hasErros === true)
            message += 'Successful!'
        else
            message += 'We had some errors! Please visit the logs'
        await res.send(message)
})

export const updatingEachUserScore = functions.https.onRequest(async (_, res) => {
        const hasErros = await utils.handlingUpdatingEachUserScore()
        let message = 'updatingEachUserScore: '
        if (hasErros === true)
            message += 'Successful!'
        else
            message += 'We had some errors! Please visit the logs'
        await res.send(message)
})