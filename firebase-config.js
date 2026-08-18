const firebaseConfig = {
  apiKey: "AIzaSyDVDAiT9xKcIWfKSz8n5zY4AOfXoPr2NKI",
  authDomain: "inventory-32b37.firebaseapp.com",
  projectId: "inventory-32b37",
  storageBucket: "inventory-32b37.firebasestorage.app",
  messagingSenderId: "111462340039",
  appId: "1:111462340039:web:267448b44487296fc935e2",
  measurementId: "G-3YP3SPTQWT"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

const auth = firebase.auth();

db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support persistence');
    }
  });

console.log('Firebase initialized successfully');