"use client";

import { Task } from "@/types/task";
import { UserData } from "@/types/user";
import { TaskCard } from "./TaskCard";
import { TaskList } from "./TaskList";
import { Button } from "@/components/ui/button";
import { Grid2X2, List, Search, SortAsc, Filter, User, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TaskGridProps {
  tasks: Task[];
  userData: UserData;
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'time';
type TaskStatus = 'in-progress' | 'completed';

interface Filters {
  status: TaskStatus[];
  hasImages: boolean | null;
  users: string[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

const ITEMS_PER_PAGE = 10;

const initialFilters: Filters = {
  status: [],
  hasImages: null,
  users: [],
};

export function TaskGrid({ tasks, userData, isLoading, onEdit, onDelete }: TaskGridProps) {
  const [isGridView, setIsGridView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userList, setUserList] = useState<UserInfo[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Fetch user information for all tasks
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData.role === 'admin') return;

      const uniqueUserIds = [...new Set(tasks.map(t => t.userId))];
      const userPromises = uniqueUserIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: userId,
              name: data.name || 'Unknown User',
              email: data.email || 'No email'
            };
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
        return null;
      });

      const users = (await Promise.all(userPromises)).filter((user): user is UserInfo => user !== null);
      setUserList(users);
    };

    fetchUsers();
  }, [tasks, userData.role]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.hasImages !== null) count++;
    if (filters.users.length > 0) count++;
    return count;
  }, [filters]);

  // Filter users for the user filter dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return userList;
    const query = userSearchQuery.toLowerCase();
    return userList.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [userList, userSearchQuery]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => {
        const user = userList.find(u => u.id === task.userId);
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          (userData.role === 'admin' && (
            task.uploaderEmail?.toLowerCase().includes(query) ||
            user?.name.toLowerCase().includes(query) ||
            user?.email.toLowerCase().includes(query)
          ))
        );
      });
    }

    // Apply user filter
    if (filters.users.length > 0) {
      result = result.filter(task => 
        filters.users.includes(task.userId)
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      result = result.filter(task => 
        filters.status.includes(task.status)
      );
    }

    // Apply image filter
    if (filters.hasImages !== null) {
      result = result.filter(task => 
        filters.hasImages ? task.images.length > 0 : task.images.length === 0
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'time': {
          const aTime = a.timeSlots[0]?.startTime || '';
          const bTime = b.timeSlots[0]?.startTime || '';
          if (!aTime && !bTime) return 0;
          if (!aTime) return 1;
          if (!bTime) return -1;
          return aTime.localeCompare(bTime);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, sortBy, filters, userData.role, userList]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTasks = filteredAndSortedTasks.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setIsFilterOpen(false);
  };

  if (isLoading) {
    return (
      <div className="col-span-full flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {userData.role === 'admin' 
            ? "No tasks have been added yet."
            : "You haven't added any tasks yet."}
        </p>
        <p className="text-sm text-gray-500">
          Click "Add Task" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col gap-3">
        {/* Search Bar - Full width on mobile */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 w-full"
          />
        </div>

        {/* Controls Row - Wraps on mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Filter Button */}
          <div className="flex-grow sm:flex-grow-0">
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-auto p-0 text-muted-foreground hover:text-primary"
                    >
                      Reset filters
                    </Button>
                  </div>

                  {/* User Filter (Admin Only) */}
                  {userData.role === 'admin' && (
                    <div className="space-y-2">
                      <Label>Filter by User</Label>
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={filters.users.includes(user.id)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  users: checked
                                    ? [...prev.users, user.id]
                                    : prev.users.filter(id => id !== user.id)
                                }));
                              }}
                            />
                            <Label htmlFor={`user-${user.id}`} className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {(['in-progress', 'completed'] as TaskStatus[]).map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                status: checked
                                  ? [...prev.status, status]
                                  : prev.status.filter(s => s !== status)
                              }));
                            }}
                          />
                          <Label htmlFor={`status-${status}`} className="capitalize">
                            {status.replace('-', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Filters */}
                  <div className="space-y-2">
                    <Label>Additional Filters</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'hasImages', label: 'Has Images' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={filters[key as keyof Filters] === true}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                [key]: checked === 'indeterminate' ? null : checked
                              }));
                            }}
                          />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort Dropdown */}
          <div className="flex-grow sm:flex-grow-0">
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => setSortBy(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SortAsc className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex-shrink-0 ml-auto">
            <div className="bg-secondary rounded-lg p-1">
              <Button
                variant={isGridView ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsGridView(true)}
                className="px-3"
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                variant={!isGridView ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsGridView(false)}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters - Scrollable on mobile */}
      {activeFilterCount > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex flex-nowrap gap-2 min-w-min">
            {filters.users.map((userId) => {
              const user = userList.find(u => u.id === userId);
              return user && (
                <Badge
                  key={userId}
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      users: prev.users.filter(id => id !== userId)
                    }));
                  }}
                >
                  <User className="h-3 w-3" />
                  {user.name} ×
                </Badge>
              );
            })}
            {filters.status.map((status) => (
              <Badge
                key={status}
                variant="secondary"
                className="capitalize"
                onClick={() => {
                  setFilters(prev => ({
                    ...prev,
                    status: prev.status.filter(s => s !== status)
                  }));
                }}
              >
                {status.replace('-', ' ')} ×
              </Badge>
            ))}
            {Object.entries(filters)
              .filter(([key, value]) => !['status', 'users'].includes(key) && value !== null)
              .map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      [key]: null
                    }));
                  }}
                >
                  {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}: {value ? 'Yes' : 'No'} ×
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-500 px-1">
        {filteredAndSortedTasks.length === tasks.length ? (
          `Showing all ${tasks.length} tasks`
        ) : (
          `Found ${filteredAndSortedTasks.length} tasks`
        )}
      </div>

      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-600">No tasks match your search criteria</p>
        </div>
      ) : isGridView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {currentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userData={userData}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={currentTasks}
          userData={userData}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={(task) => {
            const dummyEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            const element = document.querySelector(`[data-task-id="${task.id}"]`);
            if (element) {
              element.dispatchEvent(dummyEvent);
            }
          }}
        />
      )}

      {/* Pagination - Simplified on mobile */}
      {totalPages > 1 && (
        <Pagination className="mt-6 sm:mt-8">
          <PaginationContent className="flex-wrap justify-center gap-2">
            <PaginationItem className="hidden sm:block">
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageChange(page)}
                  isActive={currentPage === page}
                  className="min-w-[36px] justify-center"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem className="hidden sm:block">
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}