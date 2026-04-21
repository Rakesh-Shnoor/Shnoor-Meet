import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export const saveUser = async (user) => {
  await setDoc(doc(db, "users", user.id), {
    name: user.name,
    email: user.email,
    profilePic: user.picture
  });
};