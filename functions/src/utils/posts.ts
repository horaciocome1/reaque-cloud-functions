import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

export async function wipeDeletedUserPosts(context: functions.EventContext, user: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const snapshot = await db.collection('users').where('user.id', '==', context.params.userId).get()
        console.log(`found posts from ${user.email} | ${context.params.userId}`)
        const promises: Promise<FirebaseFirestore.WriteResult>[] = []
        snapshot.forEach(doc => {
            promises.push(db.doc(`posts/${doc.id}`).delete())
        })
        await Promise.all(promises)
        console.log(`successfully deleted ${promises.length} from ${user.email} | ${context.params.userId}`)
    } catch (err) {
        console.log(`failed deleting posts of deleted user ${user.email}`, err)
    }
}