import { useState } from "react";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { BackLink } from "../components/Shared";

/**
 * Wholesale / retail partnership enquiry form.
 *
 * Submissions land in the wholesale_inquiries table and are read from
 * Admin → Wholesale; an email is also sent, but the database row is the record
 * that matters, so a mail failure never loses an enquiry.
 */
export default function Wholesale() {
  useFadeUp();
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    hp: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await contentApi.wholesale(form);
      setStatus("done");
    } catch (err: any) {
      setError(err?.data?.error || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const field = "w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink";

  return (
    <>
      <BackLink to="/" label="BACK TO HOME" />

      <section className="py-10 md:py-16">
        <div className="max-w-[720px] mx-auto px-6 lg:px-10">
          <h1 className="text-[30px] sm:text-4xl md:text-5xl mb-4 fade-up">WHOLESALE</h1>
          <p className="text-body leading-relaxed mb-10 fade-up">
            Interested in carrying YEYPEE in your store? Tell us about your business and our team
            will get back to you.
          </p>

          {status === "done" ? (
            <div className="rounded-card bg-candy-pink-100 text-center p-10 fade-up">
              <h2 className="text-2xl mb-2">THANK YOU!</h2>
              <p className="text-body">
                We received your enquiry and will be in touch at {form.email}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5 fade-up">
              {/* Honeypot: hidden from people, tempting for bots. */}
              <input
                type="text"
                name="website"
                value={form.hp}
                onChange={(e) => set("hp", e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div>
                <label className="kicker text-body block mb-1.5">Business name *</label>
                <input
                  required
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  className={field}
                  placeholder="Toy Galaxy"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="kicker text-body block mb-1.5">Contact name *</label>
                  <input
                    required
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    className={field}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="kicker text-body block mb-1.5">Contact phone number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={field}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>

              <div>
                <label className="kicker text-body block mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={field}
                  placeholder="you@yourstore.com"
                />
              </div>

              <div>
                <label className="kicker text-body block mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={3}
                  className={field}
                  placeholder="Street, city, state, ZIP, country"
                />
              </div>

              <div>
                <label className="kicker text-body block mb-1.5">Additional notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={4}
                  className={field}
                  placeholder="Number of stores, products you are interested in, anything else we should know."
                />
              </div>

              {error && <p className="text-candy-pink text-sm font-bold">{error}</p>}

              <button type="submit" disabled={status === "sending"} className="btn-pill btn-primary">
                {status === "sending" ? "SENDING..." : "SEND ENQUIRY"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
