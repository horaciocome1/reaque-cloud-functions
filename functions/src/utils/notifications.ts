import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

export async function buildFavoriteHasNewPostNotification(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        console.log(`building notification | ${context.params.postId}`)
        const db = admin.firestore()
        const notification: FirebaseFirestore.DocumentData = {
            message: `${post.user.name} tem uma nova publicação.\n${post.title}.`,
            pic: post.pic,
            date: Timestamp.now(),
            content_id: context.params.postId,
            post: true
        }
        const snapshot = await db.doc(`users/${post.user.id}`).get()
        const user = snapshot.data()
        if (user) {
            let count = 0
            notification.users = {}
            for (const u in user.favorite_for) {
                if (user.favorite_for[u] === true) {
                    notification.users[u] = true
                    count++
                }
            }
            // if user is favorite for some body
            if (count > 0) {
                await db.collection('notifications').add(notification)
                console.log(`successfuly added notification | ${count} users`)
            } else
                console.log(`empty favorite_for | ${user.id}`)
        }
    } catch (err) {
        console.error(`failed to write notification ${context.params.postId}`, err)
    }
}

export async function buildFavoriteUpdatedProfileNotification(
    context: functions.EventContext,
    before: FirebaseFirestore.DocumentData,
    after: FirebaseFirestore.DocumentData
) {
    try {
        console.log(`building notification for user ${context.params.userId}`)
        const db = admin.firestore()
        const notification: FirebaseFirestore.DocumentData = {
            date: Timestamp.now(),
            content_id: context.params.userId,
            user: true
        }
        if (before.bio === after.bio) {
            notification.message = `${before.name} actualizou o seu endereço.\n Passou de ${before.address} para ${after.address}`
            console.log('address update')
        } else if (before.address === after.address) {
            notification.message = `${before.name} actualizou sua bio.\n"${after.bio}"`
            console.log('bio update')
        } else {
            notification.message = `${before.name} actualizou o seu perfil`
            console.log('both address and bio update')
        }
        let count = 0
        notification.users = {}
        for (const user in after.favorite_for) {
            if (after.favorite_for[user] === true) {
                notification.users[user] = true
                count++
            }
        }
        await db.collection('notifications').add(notification)
        console.log(`notification updated with users | ${count}`)
    } catch (err) {
        console.error(`failed to write notification for new post:  ${context.params.postId}`, err)
    }
}

export async function wipeFavoriteUpdatedProfileNotifications(context: functions.EventContext) {
    try {
        console.log(`wiping notification for deleted user ${context.params.userId}`)
        const db = admin.firestore()
        const snapshot = await db.collection('notifications').where('content_id', '==', context.params.userId).get()
        console.log('fetched notifications for this user')
        const promises: Promise<FirebaseFirestore.WriteResult>[] = []
        snapshot.forEach(doc => {
            promises.push(db.doc(`notifications/${doc.id}`).delete())
        })
        await Promise.all(promises)
        console.log(`successfully wiped a total of ${promises.length} notifications`)
    } catch (err) {
        console.log(`failed to wipe notification for deleted user: ${context.params.userId}`, err)
    }
}

export async function wipeFavoriteHasNewPostNotifications(context: functions.EventContext) {
    try {
        console.log(`wiping notification for deleted post ${context.params.postId}`)
        const db = admin.firestore()
        const snapshot = await db.collection('notifications').where('content_id', '==', context.params.postId).get()
        console.log('fetched notifications for this post')
        const promises: Promise<FirebaseFirestore.WriteResult>[] = []
        snapshot.forEach(doc => {
            promises.push(db.doc(`notifications/${doc.id}`).delete())
        })
        await Promise.all(promises)
        console.log(`successfully wiped a total of ${promises.length} notifications`)
    } catch (err) {
        console.log(`failed to wipe notification for deleted post: ${context.params.postId}`, err)
    }
}