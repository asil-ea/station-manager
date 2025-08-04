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
  userName?: string;
  children?: ReactNode;
  maxWidth?: string;
}

export function ResponsiveHeader({
  title,
  backHref,
  backText = "Geri",
  userEmail,
  userName,
  children,
  maxWidth = "max-w-5xl",
}: ResponsiveHeaderProps) {

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

          {(userEmail || userName) && (
            <div className="text-xs text-muted-foreground truncate">
              {userName && <span className="font-medium">{userName}</span>}
              {userName && userEmail && <span className="mx-1">•</span>}
              {userEmail && <span>{userEmail}</span>}
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
            {(userEmail || userName) && (
              <div className="text-sm text-muted-foreground truncate text-right">
          {userName && <span className="font-medium">{userName}</span>}
          {userName && userEmail && <span className="mx-1">•</span>}
          {userEmail && <span>{userEmail}</span>}
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
