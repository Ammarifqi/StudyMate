# StudyMate setup

## Enable task sync

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `supabase-schema.sql`.
3. Copy the project URL and its public anon/publishable key into `supabase-config.js`.
   Do not put a `service_role` key in this website.
4. In Supabase Authentication settings, enable email sign-in and add your deployed HTTPS address to the site's URL/redirect settings. If email confirmation is on, confirm the account before signing in.
5. Serve or deploy this folder over HTTPS. Service workers and app installation do not work from a `file://` URL. For local testing, use `http://localhost`.
6. Open the hosted site and choose **Sign in** to create or access an account. Tasks are saved on the device while offline and queued to sync when it reconnects.

The Supabase table uses row-level security so authenticated users can only read and change their own tasks. Weekly focus goals, session history, the selected focus timer duration, and appearance preferences remain stored on each device. Use **Backup JSON** or **Export CSV** on the task page to save a copy of your tasks.

Optional browser reminders notify you about unfinished tasks due today or tomorrow while StudyMate is open. They require notification permission and a secure context (HTTPS or localhost); they are not scheduled when the app is closed.

## Lectures and notes

Use **Lectures & Notes** to save a weekly lecture timetable and record audio from your device's microphone. Recording requires HTTPS or localhost and microphone permission. Live transcription is browser-dependent and may use the browser's online speech service; if it is unavailable, you can type or paste a transcript. After enabling AI summaries below, **Generate AI summary** creates structured notes from the transcript for you to review and edit.

Lecture schedules and notes are stored in this browser's local storage, and audio recordings are stored in IndexedDB on this device. They are not synced to Supabase or included in task backups. When you request an AI summary, the transcript is sent to OpenAI through the Supabase Edge Function; recordings themselves are not uploaded by StudyMate. Keep recordings only when you have permission to record the lecture, and remove audio you no longer need.

### Enable AI summaries

AI summaries use the `supabase/functions/summarize-lecture` Edge Function and OpenAI's `gpt-4o-mini` model. A transcript is sent to OpenAI only when you request a summary. Summaries require a signed-in StudyMate account and an internet connection. Each account can make up to 10 summary requests per UTC day.

1. Make sure `supabase-config.js` contains your Supabase project URL and public anon key, and that email sign-in is enabled as described above.
2. Run the updated `supabase-schema.sql` in the Supabase SQL Editor to create the private AI usage counter and its per-account daily limit.
3. Install and sign in to the [Supabase CLI](https://supabase.com/docs/guides/cli), then link this folder to your project with `supabase link --project-ref YOUR_PROJECT_REF`.
4. Add your OpenAI API key as an Edge Function secret with `supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY`. Never add this secret or a Supabase service-role key to `supabase-config.js` or browser JavaScript. Set an appropriate usage budget for the OpenAI project.
5. Deploy the function with `supabase functions deploy summarize-lecture`.
6. Sign in to StudyMate and use **Generate AI summary** on the Lectures & Notes page. Transcripts must be 30,000 characters or fewer.

## Install the app

On supported browsers, choose **Install app** when it appears or use the browser's install option. On iPhone or iPad, open the HTTPS site in Safari and use **Share → Add to Home Screen**. The app shell is cached for offline use; syncing requires an internet connection.
