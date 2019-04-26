import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

exports.createNotification = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    console.log('new post detected | ' + context.params.postId)
    const post = snap.data()
    if (post) {
        console.log('initialize app | ' + context.params.postId)
        const db = admin.firestore()

        const data = {
            message: post.user.name + ' tem uma nova publicação. ' + post.title + '.',
            pic: post.pic,
            date: context.timestamp,
            content_id: context.params.postId,
            post: true
        }
        
        try {
            const ref = await db.collection('notifications').add(data)
            console.log('notification added | ' + ref.id)

            const snapshot = await db.collection('users').where('favorites.' + post.user.id, '==', true).get()
            console.log('users detected | ' + post.user.id)

            const promises: Promise<FirebaseFirestore.WriteResult>[] = []
            snapshot.forEach(doc => {
                const users = new Map()
                users.set(doc.id, true)
                const promise = db.collection('notifications').doc(ref.id).set(data, {merge: true})
                promises.push(promise)
            });
            await Promise.all(promises)
            console.log('notification updated with users | ' + promises.length)
        } catch (error) {
            console.error('failed to write notification | ' + context.params.postId, error)
        }
    }
})