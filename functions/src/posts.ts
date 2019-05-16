import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

export async function wipeDeletedUserPosts(user: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const snapshot = await db.collection('users').where('user.id', '==', user.id).get()
        console.log(`found posts from ${user.email} | ${user.id}`)
        const promises = []
        snapshot.forEach(doc => {
            promises.push(db.doc(`posts/${doc.id}`).delete())
        })
        await Promise.all(promises)
        console.log(`successfully deleted ${promises.length} from ${user.email} | ${user.id}`)
    } catch (err) {
        console.log(`failed deleting posts of deleted user ${user.email}`)
    }
}