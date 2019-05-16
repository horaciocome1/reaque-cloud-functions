import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export async function updateTopicPostsCount(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        console.log(`update topic's posts_count`)
        const db = admin.firestore()
        const snapshot = await db.collection('posts').where('topic.id', '==', post.topic.id).get()
        console.log(`topic's posts detected`)
        let count = 0
        snapshot.forEach(_ => {
            count++
        })
        await db.doc(`topics/${post.topic.id}`).set({posts_count: count}, {merge: true})
        console.log(`topic's posts count updated | ${count}`)
    } catch (err) {
        console.log(`failed to update user's posts count ${context.params.postId}`, err)
    }
}

export async function updateUserPostsCount(context: functions.EventContext, post: FirebaseFirestore.DocumentData) {
    try {
        console.log(`update user's posts_count`);
        const db = admin.firestore()
        const snapshot = await db.collection('posts').where('user.id', '==', post.user.id).get()
        console.log(`user's posts detected`);
        let count = 0
        snapshot.forEach(_ => {
            count++
        })
        await db.doc(`users/${post.user.id}`).set({posts_count: count}, {merge: true})
        console.log(`user's posts count updated | ${count}`);
    } catch (err) {
        console.log(`failed to update user's posts count ${context.params.postId}`, err)
    } 
}

export async function updateUserFavoriteForCount(context: functions.EventContext, after: FirebaseFirestore.DocumentData) {
    try {
        console.log('somebody started or stopped following')
        const db = admin.firestore()
        let count = 0
        for (const user in after.favorite_for)
            if (after.favorite_for[user] === true)
                count++
        await db.doc(`users/${context.params.userId}`).set({favorite_for_count: count}, {merge: true})
        console.log(`favorite for count update | ${count}`)
    } catch (err) {
        console.log('favorite for count update failed')
    }
}

