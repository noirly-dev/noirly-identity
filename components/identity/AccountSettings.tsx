"use client";

import { FormEvent, useEffect, useState } from "react";
import { getCsrf } from "@/lib/auth/csrf-client";
import type { PublicUser } from "@/types";
import {
  EditorialShell,
  BusyOverlay,
  Notice,
} from "@/components/identity/EditorialShell";
import { Field } from "@/components/identity/Field";
import { ActionButton, TextLink } from "@/components/identity/Buttons";
import { DotMatrixClock } from "@/components/identity/DotMatrix";

type Props = {
  initialUser: PublicUser;
};

export function AccountSettings({ initialUser }: Props) {
  const [user, setUser] = useState(initialUser);
  const [csrf, setCsrf] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [busy, setBusy] = useState<"profile" | "password" | "logout" | null>(
    null,
  );

  useEffect(() => {
    void getCsrf().then(setCsrf);
  }, []);

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setBusy("profile");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          displayName: form.get("displayName") || undefined,
          phoneNumber: String(form.get("phoneNumber") ?? "").trim() || null,
        }),
      });
      const data = (await res.json()) as {
        user?: PublicUser;
        message?: string;
      };
      if (!res.ok || !data.user) {
        setProfileError(data.message ?? "Could not update profile");
        return;
      }
      setUser(data.user);
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError("Could not update profile");
    } finally {
      setBusy(null);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    setBusy("password");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setPasswordError(data.message ?? "Could not change password");
        return;
      }
      event.currentTarget.reset();
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 2500);
    } catch {
      setPasswordError("Could not change password");
    } finally {
      setBusy(null);
    }
  }

  async function onLogout() {
    setBusy("logout");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrf },
      });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <>
      {busy ? (
        <BusyOverlay
          label={
            busy === "logout"
              ? "Signing out"
              : busy === "password"
                ? "Updating password"
                : "Saving profile"
          }
        />
      ) : null}
      <EditorialShell
        label="Account"
        left={
          <>
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
                Session
              </p>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-[-0.05em] uppercase md:text-6xl">
                Identity
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Name, email, and password for every Noirly product. Flow and
                other apps keep only product-specific preferences.
              </p>
            </div>

            <dl className="max-w-md space-y-3 border border-dashed border-hairline p-4 font-mono text-xs text-muted">
              <div className="flex justify-between gap-4 border-b border-dashed border-hairline pb-3">
                <dt>Email</dt>
                <dd className="text-ink">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-dashed border-hairline pb-3">
                <dt>Verified</dt>
                <dd className="text-ink">
                  {user.emailVerified ? "Yes" : "Pending"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-dashed border-hairline pb-3">
                <dt>Display</dt>
                <dd className="text-ink">{user.displayName || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Password</dt>
                <dd className="text-ink">
                  {user.hasPassword ? "Set" : "Google only"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-4">
              <DotMatrixClock />
              <button
                type="button"
                onClick={() => void onLogout()}
                className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-muted underline decoration-dashed underline-offset-4 hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </>
        }
        right={
          <div className="flex flex-col gap-10">
            <form className="flex flex-col gap-5" onSubmit={onSaveProfile}>
              <div>
                <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
                  Profile
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] uppercase">
                  Edit details
                </h2>
              </div>
              <Field
                label="First name"
                name="firstName"
                defaultValue={user.firstName}
                required
                autoComplete="given-name"
              />
              <Field
                label="Last name"
                name="lastName"
                defaultValue={user.lastName}
                required
                autoComplete="family-name"
              />
              <Field
                label="Display name"
                name="displayName"
                defaultValue={user.displayName}
                autoComplete="nickname"
              />
              <Field
                label="Phone"
                name="phoneNumber"
                type="tel"
                defaultValue={user.phoneNumber ?? ""}
                autoComplete="tel"
              />
              {profileError ? <Notice>{profileError}</Notice> : null}
              {profileSaved ? <Notice>Profile saved</Notice> : null}
              <ActionButton type="submit" busy={busy === "profile"}>
                Save profile
              </ActionButton>
            </form>

            <div className="border-t border-dashed border-panel-ink/30 pt-8">
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-panel-ink/55">
                Security
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] uppercase">
                Password
              </h2>

              {user.hasPassword ? (
                <form
                  className="mt-5 flex flex-col gap-5"
                  onSubmit={onChangePassword}
                >
                  <Field
                    label="Current password"
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                  <Field
                    label="New password"
                    name="newPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                  {passwordError ? <Notice>{passwordError}</Notice> : null}
                  {passwordSaved ? (
                    <Notice>Password updated. Other sessions were signed out.</Notice>
                  ) : null}
                  <ActionButton type="submit" busy={busy === "password"}>
                    Change password
                  </ActionButton>
                  <TextLink href="/forgot-password" tone="panel">
                    Forgot password? Reset by email
                  </TextLink>
                </form>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-panel-ink/80">
                    This account signs in with Google and has no password yet.
                    Use email reset if you want to add one.
                  </p>
                  <TextLink href="/forgot-password" tone="panel">
                    Reset password by email
                  </TextLink>
                </div>
              )}
            </div>
          </div>
        }
      />
    </>
  );
}
