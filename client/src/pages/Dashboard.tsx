import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Mic2, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      refetch();
      setIsCreateDialogOpen(false);
      setProjectName("");
      setLocation(`/project/${data.id}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const handleCreateProject = () => {
    if (!projectName.trim()) return;
    createProject.mutate({ name: projectName });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Mic2 className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Podcasts</h2>
            <p className="text-gray-600 mt-1">Manage your podcast artwork projects</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Give your podcast project a name. You'll be able to import episodes and customize artwork next.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Podcast"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!projectName.trim() || createProject.isPending}>
                  {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                onClick={() => setLocation(`/project/${project.id}`)}
              >
                {/* Podcast Artwork */}
                <div className="aspect-square w-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden">
                  {project.podcastArtworkUrl ? (
                    <img 
                      src={project.podcastArtworkUrl} 
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Mic2 className="w-24 h-24 text-purple-300" />
                  )}
                </div>
                
                <CardHeader>
                  <CardTitle className="line-clamp-2">{project.name}</CardTitle>
                  <CardDescription>
                    {project.rssFeedUrl ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        RSS Connected
                      </span>
                    ) : (
                      "No RSS feed"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Created {new Date(project.createdAt!).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Mic2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Create your first podcast project to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

