import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

exports.createNotification = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    console.log('new post detected | ' + context.params.postId)
    const post = snap.data()
    if (post) {
        const db = admin.firestore()

        const data = {
            message: `${post.user.name} tem uma nova publicação. ${post.title}.`,
            pic: post.pic,
            date: context.timestamp,
            content_id: context.params.postId,
            post: true
        }
        
        try {
            const ref = await db.collection('notifications').add(data)
            console.log(`notification added | ${ref.id}`)

            // const snapshot = await db.collection('users').where(`favorites.${post.user.id}`, '==', true).get()
            const snapshot = await db.doc(`users/${post.user.id}`).get()
            const userData = snapshot.data()
            if (userData) {
                const favoriteFor = userData.favorite_for
                console.log('users detected | ' + post.user.id)

                const promises: Promise<FirebaseFirestore.WriteResult>[] = []
                for (const user in favoriteFor) {
                    const users: FirebaseFirestore.DocumentData = new Map().set('users', new Map().set(user, true))
                    const promise = db.doc(`notifications/${ref.id}`).set(users, {merge: true})
                    promises.push(promise)
                }
                console.log(`total users | ${promises.length}`)

                await Promise.all(promises)
                console.log(`notification updated with users | ${promises.length}`)
            }            
        } catch (err) {
            console.error(`failed to write notification ${context.params.postId}`, err)
        }
    }
})