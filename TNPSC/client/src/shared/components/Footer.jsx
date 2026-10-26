import React from "react";

// Internal Route  → Link
// External Website → a

const Footer = () => {
return ( <footer className="border-t mt-12"> <div className="max-w-7xl mx-auto px-6 py-10">

    <div className="grid md:grid-cols-3 gap-8">

      {/* Brand */}
      <div>
        <h2 className="text-xl font-bold">TNPSC AI</h2>
        <p className="mt-3 text-sm text-gray-600">
          AI-powered learning platform for TNPSC aspirants.
          Prepare smarter with AI Tutor, Mock Tests, and Study Plans.
        </p>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="font-semibold mb-3">Quick Links</h3>

        <ul className="space-y-2 text-sm">
          <li>
            <a href="/about">About</a>
          </li>

          <li>
            <a href="/contact">Contact</a>
          </li>

          <li>
            <a href="/privacy-policy">Privacy Policy</a>
          </li>

          <li>
            <a href="/terms-and-conditions">
              Terms & Conditions
            </a>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h3 className="font-semibold mb-3">Contact</h3>

        <p className="text-sm">
          Support Email:
        </p>

        <a
          href="mailto:support@tnpscai.com"
          className="text-sm"
        >
          support@tnpscai.com
        </a>

        <div className="flex gap-4 mt-4">
          <a href="#">Facebook</a>
          <a href="#">Instagram</a>
          <a href="#">YouTube</a>
          <a href="#">LinkedIn</a>
        </div>
      </div>

    </div>

    <div className="border-t mt-8 pt-6 text-center text-sm">
      © {new Date().getFullYear()} TNPSC AI. All rights reserved.
    </div>

  </div>
</footer>


);
};

export default Footer;
