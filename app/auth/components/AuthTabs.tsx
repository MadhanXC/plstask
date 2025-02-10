"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";

interface AuthTabsProps {
  accountType: "user" | "admin";
}

export function AuthTabs({ accountType }: AuthTabsProps) {
  return (
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="user" className="flex items-center">
        <Shield className="mr-2 h-4 w-4" />
        User Account
      </TabsTrigger>
      <TabsTrigger value="admin" className="flex items-center">
        <Shield className="mr-2 h-4 w-4 text-blue-500" />
        Admin Account
      </TabsTrigger>
    </TabsList>
  );
}