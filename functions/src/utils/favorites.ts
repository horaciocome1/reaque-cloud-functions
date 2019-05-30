import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

// the thing (user or post) somebody adds to favorite is call favorite

export async function addToFavorites(context: functions.EventContext, request: FirebaseFirestore.DocumentData) {
    try {
        console.log(`adding to favorite | ${context.params.requestId}`)
        const db = admin.firestore()
        const promises = [
            removeFavoriteFromUserFavoritesField(db),
            removeUserFromFavoriteUserOrPostFavoriteForField(db),
            deleteRequest(db)
        ]
        await Promise.all(promises)
        console.log(`succesfully added to favorite | ${context.params.requestId}`)
    } catch(err) {
        console.log(`failed adding to favorite | ${context.params.requestId} | ${err}`)
    }

    function removeFavoriteFromUserFavoritesField(db: FirebaseFirestore.Firestore) {
        // each user has an map called favorites where goes every thing is favorite for him
        const data: FirebaseFirestore.DocumentData = { favorites: {} }
        data[request.favorite] = true
        return db.doc(`users/${request.user}`).set(data, { merge: true })
    }

    function removeUserFromFavoriteUserOrPostFavoriteForField(db: FirebaseFirestore.Firestore) {
        // every post/user has an map called favorite_for
        const data: FirebaseFirestore.DocumentData = { favorite_for: {} }
        data[request.user] = true
        if (request.favorite_is_post)
            return db.doc(`posts/${request.favorite}`).set(data, { merge: true })
        else
            return db.doc(`users/${request.favorite}`).set(data, { merge: true })
    }

    function deleteRequest(db: FirebaseFirestore.Firestore) { 
        return db.doc(`add_to_favorite_requests/${context.params.requestId}`).delete()
     }
    
}

export async function removeFromFavorites(context: functions.EventContext, request: FirebaseFirestore.DocumentData) {
    try {
        console.log(`removing from favorite | ${context.params.requestId}`)
        const db = admin.firestore()
        const promises = [
            removeFavoriteFromUserFavoritesField(db),
            removeUserFromFavoriteUserOrPostFavoriteForField(db),
            deleteRequest(db)
        ]
        await Promise.all(promises)
        console.log(`succesfully removed from favorite | ${context.params.requestId}`)
    } catch(err) {
        console.log(`failed removing from favorite | ${context.params.requestId} | ${err}`)
    }

    function removeFavoriteFromUserFavoritesField(db: FirebaseFirestore.Firestore) {
        // each user has an map called favorites where goes every thing is favorite for him
        const data: FirebaseFirestore.DocumentData = { favorites: {} }
        data[request.favorite] = null
        return db.doc(`users/${request.user}`).set(data, { merge: true })
    }

    function removeUserFromFavoriteUserOrPostFavoriteForField(db: FirebaseFirestore.Firestore) {
        // every post/user has an map called favorite_for
        const data: FirebaseFirestore.DocumentData = { favorite_for: {} }
        data[request.user] = null
        if (request.favorite_is_post)
            return db.doc(`posts/${request.favorite}`).set(data, { merge: true })
        else
            return db.doc(`users/${request.favorite}`).set(data, { merge: true })
    }

    function deleteRequest(db: FirebaseFirestore.Firestore) { 
        return db.doc(`add_to_favorite_requests/${context.params.requestId}`).delete()
     }
    
}