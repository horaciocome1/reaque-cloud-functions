/*
 *    Copyright 2019 Horácio Flávio Comé Júnior
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and limitations under the License.
 */

import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore'

admin.initializeApp()

const db = admin.firestore()

const merge = { merge: true }

export async function notifySubscribedUser(userId: string, subscriberId: string, subscriber: FirebaseFirestore.DocumentData) {
    try {
        const snapshot = await db.doc(`users/${userId}`).get()
        const user = snapshot.data()
        if (user) {
            if (user.registrationToken === undefined) {
                console.error(`failed to notify subscribed user | userId: ${userId} | user does not have registration token`)
                return
            }
            const payload = {
                notification: {
                    title: subscriber.name,
                    body: `${subscriber.name} subscribed to you!`,
                    clickAction: 'MainActivity'
                },
                data: {
                    USER_ID: subscriberId
                }
            }
            const messaging = admin.messaging()
            await messaging.sendToDevice(user.registrationToken, payload)
        }
        console.log(`succeed to notify subscribed user | userId: ${userId}`)     
    } catch (err) {
        console.error(`failed to notify subscribed user | userId: ${userId} | ${err}`)       
    }
}

export async function calculateAverageRating(postId: string) {

    try {
        await db.runTransaction(async transaction => {
            const ref = db.doc(`posts/${postId}`)
            const snapshot = await transaction.get(ref.collection('ratings'))
            const ratings = snapshot.docs.map(doc => doc.data().value)
            const average = ratings.length ? ratings.reduce((total, val) => total + val) / ratings.length : 0
            const rating = round(average, 1) // 1 decimal, uma casa decimal
            return transaction.set(ref, { rating: rating }, merge)
        })
        console.log(`succeed to calculate rating | postId: ${postId}`)
    } catch (err) {
        console.error(`failed to calculate rating | postId: ${postId} | ${err}`)
    }

    function round(value: number, precision: number) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

export async function createFeedEntryForEachSubscriber(postId: string, post: FirebaseFirestore.DocumentData) {
    try {
        const feedEntry = {
            id: postId,
            title: post.title,
            pic: post.pic,
            timestamp: post.timestamp,
            user: post.user,
            score: post.score
        }
        const snapshot = await db.collection(`users/${post.user.id}/subscribers`).get()
        const batch = db.batch()
        let ref = db.doc(`users/${post.user.id}/feed/${postId}`)
        batch.set(ref, feedEntry, merge)
        snapshot.forEach(doc => {
            ref = db.doc(`users/${doc.id}/feed/${postId}`)
            batch.set(ref, feedEntry, merge)
        })
        await batch.commit()
        console.log(`succeed to create feed entries | postId: ${postId} | ${snapshot.size}`)
    } catch (err) {
        console.error(`failed to create feed entries | postId: ${postId} | ${err}`)
    }
}

export async function calculateTopicAverageScore(topicId: string) {
    try {
        let average = 0
        await db.runTransaction(async transaction => {
            const ref = db.doc(`topics/${topicId}`)
            const snapshot = await transaction.get(
                ref.collection('posts').where('score', '>=', 0)
            )
            const scores = snapshot.docs.map(doc => doc.data().score)
            average = scores.length ? scores.reduce((total, val) => total + val) / scores.length : 0
            return transaction.set(ref, { score: average }, merge)
        })
        console.log(`succeed to calculate topic average score | topicId: ${topicId} | ${average}`)
    } catch (err) {
        console.error(`failed to calculate topic average score | topicId: ${topicId} | ${err}`)
    }
}

export async function calculateUserAverageScore(userId: string) {
    try {
        let average = 0
        await db.runTransaction(async transaction => {
            const ref = db.doc(`users/${userId}`)
            const snapshot = await transaction.get(
                ref.collection('posts').where('score', '>=', 0)
            )
            const scores = snapshot.docs.map(doc => doc.data().score)
            average = scores.length ? scores.reduce((total, val) => total + val) / scores.length : 0
            return transaction.set(ref, { score: average }, merge)
        })
        console.log(`succeed to calculate user average score | userId: ${userId} | ${average}`)
    } catch (err) {
        console.error(`failed to calculate user average score | userId: ${userId} | ${err}`)
    }
}

export async function initializeUser(user: admin.auth.UserRecord) {

    try {
        const data = {
            name: user.displayName,
            email: user.email,
            pic: user.photoURL,
            since: Timestamp.now(),
            top_topic: '',
            subscriptions: 0,
            subscribers: 0,
            posts: 0,
            score: 0,
            bookmarks: 0
        }
        await db.doc(`users/${user.uid}`).set(data, merge)
        console.log(`succeed to initialize user | userId: ${user.uid}`)
        await createFeedToNewUser()
    } catch (err) {
        console.error(`failed to initialize user | userId: ${user.uid} | ${err}`)
    }

    async function createFeedToNewUser() {
        try {
            const snapshot = await db.collection('posts').orderBy('score', 'desc').limit(20).get()
            const batch = db.batch()
            snapshot.forEach(doc => {
                const post = doc.data()
                if (post) {
                    const feedEntry = {
                        id: doc.id,
                        title: post.title,
                        pic: post.pic,
                        timestamp: post.timestamp,
                        user: post.user,
                        score: post.score
                    }
                    const ref = db.doc(`users/${user.uid}/feed/${doc.id}`)
                    batch.set(ref, feedEntry)
                }
            })
            await batch.commit()
            console.log(`succeed to create feed to new user | userId: ${user.uid}`)
        } catch (err) {
            console.error(`failed to create feed to new user | userId: ${user.uid} | ${err}`)
        }
    }

}

export async function calculatePostScore(postId: string) {

    try {
        let score = 0
        const ref = db.doc(`posts/${postId}`)
        await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(ref)
            const post = snapshot.data()
            if (post) {
                const timestamp: FirebaseFirestore.Timestamp = post.timestamp
                score = getFactor(99, timestamp.seconds)
                    + getFactor(0.05, post.readings)
                    + getFactor(0.30, post.bookmarks)
                    + getFactor(0.30, post.shares)
                    + getFactor(0.35, post.rating)
            }
            return transaction.set(ref, { score: score }, merge)
        })
        console.log(`succeed to calculate post's score | postId: ${postId} | ${score}`)
        await propagatePostScore(score)
    } catch (err) {
        console.error(`failed to calculate post's score | postId: ${postId} | ${err}`)
    }
    
    function getFactor(percent: number, x: number): number {
        if (x !== 0)
            return (1 - (1 / x)) * (percent / 100)
        return 0
    }

    async function propagatePostScore(score: number) {

        return Promise.all([
            update('posts'),
            update('bookmarks'),
            update('feed')
        ])

        async function update(collectionName: string) {
            try {
                const snapshot = await db.collectionGroup(collectionName).where('id', '==', postId).get()
                const batch = db.batch()
                snapshot.forEach(doc => batch.set(doc.ref, { score: score }, merge))
                await batch.commit()
                console.log(`succeed to propagate post's updates to collection | collectionName: ${collectionName} | ${snapshot.size}`)
            } catch (err) {
                console.error(`failed to propagate post's updates to collection | collectionName: ${collectionName} | ${err}`)        
            }
        }

    }

}

export async function propagateUserUpdates(userId: string) {
        
    try {
        const snapshot = await db.doc(`users/${userId}`).get()
        const user = snapshot.data()
        if (user) {
            const data = {
                subscribers: user.subscribers,
                top_topic: user.top_topic,
                score: user.score
            }
            await Promise.all([
                update(data, 'subscriptions'),
                update(data, 'subscribers'),
                update(data, 'users')
            ])
        }   
        console.log(`succeed to propagate user's updates | userId: ${userId}`)
    } catch (err) {
        console.error(`failed to propagate user's updates | userId: ${userId} | ${err}`)
    }

    async function update(data: any, collectionName: string) {
        try {
            const snapshot = await db.collectionGroup(collectionName).where('id', '==', userId).get()
            const batch = db.batch()
            snapshot.forEach(doc => batch.set(doc.ref, data, merge))
            await batch.commit()
            console.log(`succeed to propagate user's updates to collection | collectionName: ${collectionName} | ${snapshot.size}`)
        } catch (err) {
            console.error(`failed to propagate user's updates to collection | collectionName: ${collectionName} | ${err}`)        
        }
    }

}