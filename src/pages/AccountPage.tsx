
import React from "react";

const AccountPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-5 font-playfair text-saffron">Account Settings</h1>
      <div className="space-y-6">
        {/* Profile info */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Profile Information</h2>
          {/* TODO: Show and allow update of username, email, avatar, phone */}
          <div>Coming soon: View &amp; update your profile (username, avatar, linked email/phone).</div>
        </section>
        {/* Addresses */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Saved Addresses</h2>
          <div>Coming soon: Add, edit, delete your shipping addresses.</div>
        </section>
        {/* MFA */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Multi-Factor Authentication</h2>
          <div>Coming soon: Enable/disable two-factor authentication for added security.</div>
        </section>
        {/* Account Linking */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2">Account Linking</h2>
          <div>Coming soon: Link additional emails, phone numbers, or social accounts.</div>
        </section>
        {/* Account Deletion */}
        <section className="p-5 border rounded-md bg-white shadow">
          <h2 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h2>
          <div>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
              disabled
              title="Coming soon"
            >
              Delete My Account
            </button>
            <p className="mt-1 text-sm text-red-400">
              This action is permanently remove your account and data.
            </p>
            <div className="mt-2 text-neutral-500">Coming soon: Account deletion.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
export default AccountPage;
