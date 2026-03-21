import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

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

const mapping = {
  team1: '/images/logo_team_a.png',
  team2: '/images/logo_team_b.png',
  team3: '/images/logo_team_c.png',
  team4: '/images/logo_team_d.png',
  team5: '/images/logo_team_e.png',
  team6: '/images/logo_team_f.png',
  team7: '/images/logo_team_g.png',
  team8: '/images/logo_team_h.png',
  team9: '/images/logo_team_i.png'
};

async function run() {
  for (const [teamId, logoPath] of Object.entries(mapping)) {
    try {
      await updateDoc(doc(db, 'teams', teamId), { logoUrl: logoPath });
      console.log(`Updated ${teamId} with logo ${logoPath}`);
    } catch(e) {
      console.log("Failed", teamId, e.message);
    }
  }
  process.exit(0);
}
run();
