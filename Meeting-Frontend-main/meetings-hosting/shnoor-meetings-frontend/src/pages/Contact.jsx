import { Mail, Phone, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4">
            Shnoor International LLC
          </h2>

          <p className="mb-6 text-blue-100">
            Reach out to us anytime. We're here to help you with meetings,
            collaboration, and support.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone size={18} />
              <span>+91 9876555555</span>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={18} />
              <span>support@shnoor.com</span>
            </div>

            <div className="flex items-center gap-3">
              <MessageCircle size={18} />
              <span>Chat on WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Contact Us
          </h2>

          <p className="text-gray-500 mb-6">
            Have questions? Send us a message and we’ll get back to you.
          </p>

          <form className="space-y-5">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full bg-transparent text-black placeholder-gray-400 border-b border-gray-300 py-2 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                placeholder="Your email"
                className="w-full bg-transparent text-black placeholder-gray-400 border-b border-gray-300 py-2 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Message</label>
              <textarea
                rows="3"
                placeholder="Write your message"
                className="w-full bg-transparent text-black placeholder-gray-400 border-b border-gray-300 py-2 outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            >
              Send Message
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}