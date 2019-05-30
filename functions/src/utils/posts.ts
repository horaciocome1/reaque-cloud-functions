import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

export async function wipeDeletedUserPosts(context: functions.EventContext, user: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const snapshot = await db.collection('users').where('user.id', '==', context.params.userId).get()
        console.log(`found posts from ${user.email} | ${context.params.userId}`)
        const promises: Promise<FirebaseFirestore.WriteResult>[] = []
        snapshot.forEach(doc => promises.push(db.doc(`posts/${doc.id}`).delete()))
        await Promise.all(promises)
        console.log(`successfully deleted ${promises.length} from ${user.email} | ${context.params.userId}`)
    } catch (err) {
        console.log(`failed deleting posts of deleted user ${user.email}`, err)
    }
}

export async function addPostTopicToUser(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        const db = admin.firestore()
        const data: FirebaseFirestore.DocumentData = { topics: {} }
        data.topics[post.topic.id] = true
        await db.doc(`users/${post.user.id}`).set(data, { merge: true })
        console.log(`successfully added post's topic to user | ${context.params.postId}`)
    } catch (err) {
        console.log(`failed adding post's topic to user | ${context.params.postId}`, err)
    }
}