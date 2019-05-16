import * as admin from 'firebase-admin'
import { Timestamp } from '@google-cloud/firestore';

// tslint:disable-next-line: no-empty
export async function saveUserData(user: admin.auth.UserRecord) {
    try {
        const data = {
            name: user.displayName,
            email: user.email,
            pic: user.photoURL,
            since: Timestamp.now()
        }
        const db = admin.firestore()
        await db.collection('users').doc(user.uid).set(data, {merge: true})
        console.log(`successfully saver users data ${user.email} | ${user.uid}`);
        
    } catch (err) {
        console.log(`failed to save user data for ${user.email}`, err)
        
    }
}