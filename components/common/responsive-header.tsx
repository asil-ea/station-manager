"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface ResponsiveHeaderProps {
  title: string;
  backHref?: string;
  backText?: string;
  userEmail?: string;
  children?: ReactNode;
  maxWidth?: string;
}

export function ResponsiveHeader({
  title,
  backHref,
  backText = "Geri",
  userEmail,
  children,
  maxWidth = "max-w-5xl",
}: ResponsiveHeaderProps) {

  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground hidden sm:block">
        {userEmail}
        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
          Admin
        </span>
      </span>
      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded sm:hidden">
        Admin
      </span>
    </div>
  );
  return (
    <header className="border-b border-b-foreground/10">
      <div className={`${maxWidth} mx-auto p-4`}>
        {/* Mobile layout */}
        <div className="flex flex-col gap-4 sm:hidden">
          <div className="flex justify-between items-center">
            {backHref && (
              <Link href={backHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">{backText}</span>
                </Button>
              </Link>
            )}
            {!backHref && <div></div>}
            {<LogoutButton />}
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold truncate pr-2">
              {title}
            </h1>
            {children}
          </div>

          {userEmail && (
            <div className="text-xs text-muted-foreground truncate">
              {userEmail}
            </div>
          )}
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:flex justify-between items-center">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link href={backHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backText}
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold">{title}</h1>
            {children}
          </div>

          <div className="flex items-center gap-4">
            {<LogoutButton />}
          </div>
        </div>
      </div>
    </header>
  );
}
