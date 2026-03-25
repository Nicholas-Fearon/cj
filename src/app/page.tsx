import {
  SignInButton,
  SignUpButton,
} from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import CoachDashboard from '@/components/CoachDashboard';

export default async function Home() {
  const { userId } = await auth();

  return (
    <>
      {!userId ? (
        <main className="landing-shell">
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="eyebrow">Game day command center</p>
              <h1>Run your whole basketball program from one place.</h1>
              <p className="hero-text">
                Plan training, manage rosters, prepare for tip-off, track live
                stats, review performance, and keep a coaching journal that
                grows with every season.
              </p>
              <div className="hero-actions">
                <SignUpButton>
                  <button className="primary-button">Create your workspace</button>
                </SignUpButton>
                <SignInButton>
                  <button className="secondary-button">Sign in</button>
                </SignInButton>
              </div>
            </div>
            <div className="hero-panel">
              <div className="hero-card">
                <span>Team Hub</span>
                <strong>Rosters, practice groups, and game lists</strong>
              </div>
              <div className="hero-card">
                <span>Pre-game</span>
                <strong>Scout notes, priorities, and rotation plans</strong>
              </div>
              <div className="hero-card">
                <span>In-game</span>
                <strong>Live player stats, fouls, and bench notes</strong>
              </div>
              <div className="hero-card">
                <span>Post-game + Journal</span>
                <strong>Reflection, learnings, and next-session actions</strong>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <CoachDashboard />
      )}

    </>
  );
}
