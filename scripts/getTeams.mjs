import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAljEiUJmvmFk_d19UtyLQBBOb9p66WLdw",
  authDomain: "jpl-03.firebaseapp.com",
  projectId: "jpl-03",
  storageBucket: "jpl-03.firebasestorage.app",
  messagingSenderId: "613229955485",
  appId: "1:613229955485:web:55b340930f52186d614774",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, "teams"));
  const teams = [];
  querySnapshot.forEach((doc) => {
    teams.push({ id: doc.id, ...doc.data() });
  });
  console.log(JSON.stringify(teams, null, 2));
  process.exit(0);
}
run();
