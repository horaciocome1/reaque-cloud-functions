import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore';

admin.initializeApp()

exports.onPostCreated = functions.firestore.document('posts/{postId}').onCreate(async (snap, context) => {
    console.log('new post detected | ' + context.params.postId)

    const post = snap.data()
    if (post) {
        const db = admin.firestore()
        
        // ---------------------------------------------------------------------------------------------
        // build notification
        try {
            console.log(`building notification | ${context.params.postId}`);
            
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
                
                if (count > 0) {
                    await db.collection('notifications').add(notification)
                    console.log(`successfuly added notification | ${count} users`)
                } else
                    console.log(`empty favorite_for | ${user.id}`)
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

            const snapshot = await db.collection('posts').where('topic.id', '==', post.topic.id).get()
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

            const snapshot = await db.collection('posts').where('topic.id', '==', post.topic.id).get()
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

exports.onUserUpdated = functions.firestore.document('users/{userId}').onUpdate(async (snap, context) => {
    console.log('user update detected | ' + context.params.userId)

    const before = snap.before.data()
    const after = snap.after.data()

    if (before && after) {
        const db = admin.firestore()

        if (before.favorite_for !== after.favorite_for) {
            console.log('somebody started or stopped following')

            // ---------------------------------------------------------------------------------------------
            // update favorite for count
            try {
                let count = 0
                for (const user in after.favorite_for) {
                    if (after.favorite_for[user] === true)
                        count++
                }
                
                await db.doc(`users/${context.params.userId}`).set({favorite_for_count: count}, {merge: true})
                console.log(`favorite for count update | ${count}`)
            } catch (err) {
                console.log('favorite for count update failed')
            }
        } 
        if (before.bio !== after.bio || before.address !== after.address) {

            // ---------------------------------------------------------------------------------------------
            // build notification
            try {
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
                console.error(`failed to write notification ${context.params.postId}`, err)
            }
        }
    }
})
