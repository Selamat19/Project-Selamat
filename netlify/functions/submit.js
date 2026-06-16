// SELAMAT — submission handler
// Receives form data from index.html, saves it to Airtable, and emails a notification.

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const data = await req.json();

    const {
      name,
      phone,
      email,
      bestTime,
      categories,
      story,
      expectation,
      urgency,
      recordingUrl,
      submittedAt,
    } = data;

    // ── 1. Save to Airtable ──
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Submissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            Name: name || "Anonymous",
            Phone: phone || "",
            Email: email || "",
            "Best Time to Call": bestTime || "",
            Categories: categories || "",
            "What Happened": story || "",
            "What They Hope For": expectation || "",
            Urgency: urgency || "",
            "Voice Recording": recordingUrl || "No recording",
            "Submitted At": submittedAt || new Date().toISOString(),
            Status: "New",
          },
        }),
      }
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      console.error("Airtable error:", errText);
      return new Response(JSON.stringify({ error: "Failed to save submission" }), { status: 500 });
    }

    // ── 2. Send email notification via Resend ──
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SELAMAT <onboarding@resend.dev>",
          to: process.env.NOTIFY_EMAIL,
          subject: `New SELAMAT submission — ${urgency || "Urgency not specified"}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color:#cb5b3b;">New submission received</h2>
              <p><strong>Name:</strong> ${name || "Anonymous"}</p>
              <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
              <p><strong>Email:</strong> ${email || "Not provided"}</p>
              <p><strong>Best time to call:</strong> ${bestTime || "Not specified"}</p>
              <p><strong>Category:</strong> ${categories || "Not specified"}</p>
              <p><strong>Urgency:</strong> ${urgency || "Not specified"}</p>
              <hr/>
              <p><strong>What happened:</strong><br/>${(story || "No details provided").replace(/\n/g, "<br/>")}</p>
              <p><strong>What they hope for:</strong><br/>${(expectation || "Not specified").replace(/\n/g, "<br/>")}</p>
              <hr/>
              <p><strong>Voice recording:</strong> ${
                recordingUrl && recordingUrl !== "No recording"
                  ? `<a href="${recordingUrl}">Listen to recording</a>`
                  : "No recording"
              }</p>
              <p style="color:#888; font-size:12px;">Submitted at ${submittedAt}</p>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      // Don't fail the whole submission if just the email notification fails
      console.error("Resend email error:", emailErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Submission error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
};
