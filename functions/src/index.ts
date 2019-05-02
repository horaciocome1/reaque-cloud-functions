import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore';

admin.initializeApp()

exports.onPostCreate = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    console.log('new post detected | ' + context.params.postId)

    const post = snap.data()
    if (post) {
        const db = admin.firestore()
        
        // ---------------------------------------------------------------------------------------------
        // build notification
        try {
            const data = {
                message: `${post.user.name} tem uma nova publicação.\n${post.title}.`,
                pic: post.pic,
                date: Timestamp.now(),
                content_id: context.params.postId,
                post: true
            }

            const ref = await db.collection('notifications').add(data)
            console.log(`notification added | ${ref.id}`)

            const snapshot = await db.doc(`users/${post.user.id}`).get()
            const userData = snapshot.data()
            if (userData) {
                const favoriteFor = userData.favorite_for
                console.log('users detected | ' + post.user.id)

                const promises: Promise<FirebaseFirestore.WriteResult>[] = []
                for (const user in favoriteFor) {
                    const notification: FirebaseFirestore.DocumentData = {
                        'users': {}
                    }
                    notification.users[user] = true
                    const promise = ref.set(notification, {merge: true})
                    promises.push(promise)
                }
                console.log(`total users | ${promises.length}`)

                await Promise.all(promises)
                console.log(`notification updated with users | ${promises.length}`)
            }            
        } catch (err) {
            console.error(`failed to write notification ${context.params.postId}`, err)
        }

        // ---------------------------------------------------------------------------------------------
        // update user's posts_count
        try {
            console.log(`update user's posts_count`);

            const snapshot = await db.collection('posts').where('user.id', '==', post.user.id).get()
            console.log('posts detected');

            let count = 0
            snapshot.forEach(_ => {
                count++
            })
            await db.doc(`users/${post.user.id}`).set({posts_count: count}, {merge: true})
            console.log(`user's posts count updated | ${count}`);
        } catch (err) {
            console.log(`failed to update posts count ${context.params.postId}`, err);
        }

        // ---------------------------------------------------------------------------------------------
        // update topics's posts_count
        try {
            console.log(`update topic's posts_count`);

            const snapshot = await db.collection('posts').where('user.id', '==', post.topic.id).get()
            console.log(`topic's posts detected`);

            let count = 0
            snapshot.forEach(_ => {
                count++
            })
            await db.doc(`topics/${post.topic.id}`).set({posts_count: count}, {merge: true})
            console.log(`topic's posts count updated | ${count}`);
        } catch (err) {
            console.log(`failed to update user's posts count ${context.params.postId}`, err);
        }
    }
})

exports.onPostDeleted = functions.firestore.document('posts/{postId}').onDelete(async (snap, context) => {
    console.log('post delete detected | ' + context.params.postId)

    const post = snap.data()
    if (post) {
        const db = admin.firestore()

        // ---------------------------------------------------------------------------------------------
        // update user's posts_count
        try {
            console.log(`update user's posts_count`);

            const snapshot = await db.collection('posts').where('user.id', '==', post.user.id).get()
            console.log(`user's posts detected`);

            let count = 0
            snapshot.forEach(_ => {
                count++
            })
            await db.doc(`users/${post.user.id}`).set({posts_count: count}, {merge: true})
            console.log(`user's posts count updated | ${count}`);
        } catch (err) {
            console.log(`failed to update user's posts count ${context.params.postId}`, err);
        }

        // ---------------------------------------------------------------------------------------------
        // update topics's posts_count
        try {
            console.log(`update topic's posts_count`);

            const snapshot = await db.collection('posts').where('user.id', '==', post.topic.id).get()
            console.log(`topic's posts detected`);

            let count = 0
            snapshot.forEach(_ => {
                count++
            })
            await db.doc(`topics/${post.topic.id}`).set({posts_count: count}, {merge: true})
            console.log(`topic's posts count updated | ${count}`);
        } catch (err) {
            console.log(`failed to update posts count ${context.params.postId}`, err);
        }
    }
})

exports.onUserUpdate = functions.firestore.document('users/{userId}').onUpdate(async (snap, context) => {
    console.log('user update detected | ' + context.params.userId)

    const before = snap.before.data()
    const after = snap.after.data()

    if (before && after) {
        const db = admin.firestore()

        if (before.favorite_for !== after.favorite_for) {
            console.log('somebody started or stopped following')


            // ---------------------------------------------------------------------------------------------
            // update followers count
            try {
                let count = 0
                for (const user in after.favorite_for) {
                    if (after.favorite_for[user] === true)
                        count++
                }
                
                await db.doc(`users/${context.params.userId}`).set({followers_count: count}, {merge: true})
                console.log(`followers count update | ${count}`)
            } catch (err) {
                console.log('followers update failed')
            }
        } else if (before.bio !== after.bio || before.address !== after.address) {

            // ---------------------------------------------------------------------------------------------
            // build notification
            try {
                let message = ''

                if (before.bio === after.bio) {
                    message = `${before.name} actualizou o seu endereço.\n Passou de ${before.address} para ${after.address}`
                    console.log('address update')
                } else if (before.address === after.address) {
                    message = `${before.name} actualizou sua bio.\n\n"${after.bio}"`
                    console.log('bio update')
                } else {
                    message = `${before.name} actualizou o seu perfil`
                    console.log('both address and bio update')
                }
    
                const data = {
                    message: message,
                    date: Timestamp.now(),
                    content_id: context.params.userId,
                    user: true
                }

                const ref = await db.collection('notifications').add(data)
                console.log(`notification added | ${ref.id}`)

                const snapshot = await db.doc(`users/${context.params.userId}`).get()
                const userData = snapshot.data()
                if (userData) {
                    const favoriteFor = userData.favorite_for
                    console.log('users detected | ' + context.params.userId)

                    const promises: Promise<FirebaseFirestore.WriteResult>[] = []
                    for (const user2 in favoriteFor) {
                        const notification: FirebaseFirestore.DocumentData = {
                            'users': {}
                        }
                        notification.users[user2] = true
                        const promise = ref.set(notification, {merge: true})
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
    }
})