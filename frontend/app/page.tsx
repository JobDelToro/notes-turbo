import { redirect } from 'next/navigation';

/** The app is the notes workspace; send everyone there (auth is enforced by
 * the /notes route guard). */
export default function Home() {
  redirect('/notes');
}
