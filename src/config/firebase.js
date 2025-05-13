import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Firebase konfigürasyon bilgileri
const firebaseConfig = {
  apiKey: 'AIzaSyBcSEpUmAUo-vzhTIkfSM2P1BFjSApJgnc',
  authDomain: 'rota1-47222.firebaseapp.com',
  projectId: 'rota1-47222',
  storageBucket: 'rota1-47222.firebasestorage.app',
  messagingSenderId: '786461905079',
  appId: '1:786461905079:web:6b8623cb0ebf6396af3d32',
  measurementId: 'G-MTJCENGLY5',
};

// Firebase'i başlatma
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
