"use strict";

// Defense in depth: persisted URLs can predate current server validation, so
// validate the scheme again immediately before using a value for navigation.
function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeThemeToggle();
  initializeSectionNavigation();

  initializeLogin();
  initializeRegistration();
  initializeLogout();
  initializeDashboardProfile();
  initializeSkillsTracker();
  initializeProjectsTracker();
  initializeCourses();
  initializeInternships();
  initializeApplicationTracker();
  initializeAdminCourseForm();
  initializeStudentAnalytics();
  initializeCommunitySearch();
  initializeDashboardQuickSearch();
});

// Theme preference is stored locally; no backend or account data is involved.
function initializeThemeToggle() {
  const themeKey = "student-tracker-theme";
  const savedTheme = (() => {
    try { return localStorage.getItem(themeKey); } catch { return null; }
  })();
  const systemPrefersDark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const createThemeIcon = (dark) => {
    const ns = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(ns, "svg");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "19");
    icon.setAttribute("height", "19");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    if (dark) {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12"); circle.setAttribute("r", "4");
      const rays = document.createElementNS(ns, "path");
      rays.setAttribute("d", "M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l-1.42 1.42m11.3-11.3 1.42-1.42");
      icon.append(circle, rays);
    } else {
      const moon = document.createElementNS(ns, "path");
      moon.setAttribute("d", "M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z");
      icon.append(moon);
    }
    return icon;
  };

  let button = document.getElementById("themeToggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "floating-theme-toggle theme-toggle";
    button.id = "themeToggle";
    document.body.appendChild(button);
  }

  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll("#themeToggle, .floating-theme-toggle").forEach((control) => {
      const dark = theme === "dark";
      control.replaceChildren(createThemeIcon(dark));
      control.setAttribute("aria-pressed", String(dark));
      control.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      control.setAttribute("title", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  };

  applyTheme(savedTheme === "dark" || savedTheme === "light"
    ? savedTheme : (systemPrefersDark ? "dark" : "light"));

  // One delegated listener also supports a toggle inserted by another page script.
  document.addEventListener("click", (event) => {
    const control = event.target.closest("#themeToggle, .floating-theme-toggle");
    if (!control) return;
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(themeKey, next); } catch { /* Storage may be unavailable. */ }
  });
}


// LOGIN
function initializeLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const message = document.getElementById("loginMessage");
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Logging in...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      window.location.href = "/index.html";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Log In";
    }
  });
}

// REGISTRATION
function initializeRegistration() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const message = document.getElementById("registerMessage");
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const ageConsent = data.get("ageConsent") === "true";
    const termsConsent = data.get("termsConsent") === "true";

    if (!ageConsent || !termsConsent) {
      message.textContent = "Please confirm the age requirement and accept the Terms of Service and Privacy Policy.";
      return;
    }

    button.disabled = true;
    button.textContent = "Creating Account...";
    message.textContent = "";

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ name, email, password, ageConsent, termsConsent })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed.");
      }

      form.reset();
      message.textContent = "Account created! Redirecting to login...";

      window.setTimeout(() => {
        window.location.href = "/login.html";
      }, 1000);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  });
}

// LOGOUT
function initializeLogout() {
  const button = document.getElementById("logoutButton");
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Logging out...";

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Logout failed.");
      }

      window.location.replace("/");
    } catch (error) {
      alert(error.message || "Unable to log out. Please try again.");
      button.disabled = false;
      button.textContent = "Logout";
    }
  });
}
// UPDATE PROFILE AVATARS IN THE TOP BAR AND SIDEBAR
function updateDashboardAvatars(user) {
  const photo = typeof user?.photoData === "string"
    ? user.photoData.trim()
    : "";

  const avatarPairs = [
    {
      image: document.getElementById("dashboardProfileImage"),
      fallback: document.getElementById("dashboardProfileFallback")
    },
    {
      image: document.getElementById("sidebarProfileImage"),
      fallback: document.getElementById("sidebarProfileFallback")
    }
  ];

  avatarPairs.forEach(({ image, fallback }) => {
    if (!image || !fallback) return;

    if (photo) {
      image.src = photo;
      image.hidden = false;
      fallback.hidden = true;

      image.onerror = () => {
        image.hidden = true;
        fallback.hidden = false;
      };
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      fallback.hidden = false;
    }
  });
}
// LOAD PROFILE AND DETERMINE ROLE
async function initializeDashboardProfile() {
  const heading = document.getElementById("welcomeHeading");
  if (!heading) return;

  try {
    const response = await fetch("/api/auth/me", {
      headers: { Accept: "application/json" }
    });

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    const result = await response.json();

    if (!response.ok || !result.user) {
      throw new Error(result.message || "Unable to load profile.");
    }

    const user = result.user;

    updateDashboardAvatars(user);

    heading.textContent = "Ready to Level Up?";

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileRole = document.getElementById("profileRole");
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole) profileRole.textContent = user.role;

    const isAdmin = user.role === "admin";
    const adminSection = document.getElementById("adminCourses");
    const adminLink = document.getElementById("adminNavLink");
    if (adminSection) adminSection.hidden = !isAdmin;
    if (adminLink) adminLink.hidden = !isAdmin;

    if (isAdmin && typeof loadAdminCourses === "function") {
      loadAdminCourses();
    }

    initializeProfileEditor(user);
  } catch (error) {
    console.error("Profile loading error:", error);
    heading.textContent = "Ready to Level Up?";
    const message = document.getElementById("profileMessage");
    if (message) message.textContent = "We couldn't load your profile. Refresh the page to try again.";
  }
}

// PROFILE EDITOR
function initializeProfileEditor(user) {
  const form = document.getElementById("profileForm");
  if (!form) return;

  const byId = (id) => document.getElementById(id);
  const displayName = byId("profileDisplayName");
  const headline = byId("profileHeadline");
  const photoDisplay = byId("profilePhotoDisplay");
  const photoPreview = byId("profilePhotoPreview");
  const fallbackDisplay = byId("profileAvatarFallback");
  const fallbackPreview = byId("profilePhotoFallback");
  const photoInput = byId("profilePhotoInput");
  const removePhotoButton = byId("removeProfilePhoto");
  const message = byId("profileMessage");
  const saveButton = byId("saveProfileButton");
  const bioInput = byId("profileBio");
  const bioCount = byId("profileBioCount");
  const privacyNote = byId("profilePrivacyNote");
  const publicToggle = byId("publicProfileToggle");
  const visibilityMessage = byId("profileVisibilityMessage");
  if (publicToggle) publicToggle.checked = user.publicProfile === true;

  if (publicToggle) publicToggle.addEventListener("change", async () => {
    publicToggle.disabled = true;
    if (visibilityMessage) visibilityMessage.textContent = "Saving visibility…";
    try {
      const response = await fetch("/api/community/privacy", {
        method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ publicProfile: publicToggle.checked })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update visibility.");
      user.publicProfile = result.publicProfile;
      if (visibilityMessage) visibilityMessage.textContent = result.message;
      if (privacyNote) privacyNote.textContent = result.publicProfile
        ? "Your profile is public. Your profile details, skills and certificate links can appear in search. Keep personal details out of your bio."
        : "Your profile is private and will not appear in public people search.";
      window.dispatchEvent(new CustomEvent("profileVisibilityChanged", { detail: { publicProfile: result.publicProfile } }));
    } catch (error) {
      publicToggle.checked = !publicToggle.checked;
      if (visibilityMessage) visibilityMessage.textContent = error.message;
    } finally { publicToggle.disabled = false; }
  });

  let photoData = user.photoData || "";

  const initialsFor = (name) => {
    const parts = String(name || "Student Tracker").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0].toUpperCase()).join("") || "ST";
  };

  const updatePhoto = (data) => {
    photoData = data || "";
    for (const image of [photoDisplay, photoPreview]) {
      if (!image) continue;
      if (photoData) {
        image.src = photoData;
        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.hidden = true;
      }
    }
    if (fallbackDisplay) {
      fallbackDisplay.textContent = initialsFor(user.name);
      fallbackDisplay.hidden = Boolean(photoData);
    }
    if (fallbackPreview) {
      fallbackPreview.textContent = initialsFor(user.name);
      fallbackPreview.hidden = Boolean(photoData);
    }
  };

  const updateSummary = () => {
    if (displayName) displayName.textContent = user.name;
    const profession = byId("profileProfession")?.value || user.professionType || "student";
    const college = byId("profileCollege")?.value.trim();
    const degree = byId("profileDegree")?.value.trim();
    const studyYear = byId("profileStudyYear")?.value.trim();
    const field = byId("profileFieldOfStudy")?.value.trim();
    const location = byId("profileLocation")?.value.trim();
    const bio = byId("profileBio")?.value.trim();

    const details = [];
    if (profession === "student") {
      if (degree) details.push(degree);
      else details.push("Student");
      if (college) details.push(college);
      if (studyYear) details.push(studyYear);
    } else {
      details.push(profession.replace(/\b\w/g, letter => letter.toUpperCase()));
      if (field) details.push(field);
    }
    if (location) details.push(location);
    if (headline) headline.textContent = details.join(" · ") || "Add your profession and education to introduce yourself.";
    const bioPreview = byId("profileBioPreview");
    if (bioPreview) bioPreview.textContent = bio || "Your bio will appear here once you add it.";
  };

  byId("profileAge").value = user.age ?? "";
  byId("profileProfession").value = user.professionType || "student";
  byId("profileCollege").value = user.college || "";
  byId("profileDegree").value = user.degree || "";
  byId("profileStudyYear").value = user.studyYear || "";
  byId("profileFieldOfStudy").value = user.fieldOfStudy || "";
  byId("profileLocation").value = user.location || "";
  byId("profileHobbies").value = user.hobbies || "";
  byId("profileBio").value = user.bio || "";
  if (bioCount) bioCount.textContent = String((user.bio || "").length);

  const updatePrivacyNote = () => {
    const ageValue = byId("profileAge").value;
    const age = ageValue ? Number(ageValue) : null;
    if (privacyNote) {
      privacyNote.textContent = age !== null && age < 18
        ? "Because you're under 18, keep personal details minimal. Public profile visibility is unavailable for accounts with an age under 18."
        : user.publicProfile
          ? "Your profile is public. Your profile details, skills and certificate links can appear in search. Keep personal details out of your bio."
          : "Your profile is private and will not appear in public people search.";
    }
  };

  updatePhoto(photoData);
  updateSummary();
  updatePrivacyNote();

  form.querySelectorAll("input, select, textarea").forEach(control => {
    control.addEventListener("input", () => {
      updateSummary();
      updatePrivacyNote();
      if (control === bioInput && bioCount) {
        bioCount.textContent = String(bioInput.value.length);
      }
    });
    control.addEventListener("change", updateSummary);
  });

  if (photoInput) {
    photoInput.addEventListener("change", async () => {
      message.textContent = "";
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;

      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        message.textContent = "Choose a PNG, JPG, or WebP image.";
        photoInput.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.textContent = "Choose an image smaller than 10 MB.";
        photoInput.value = "";
        return;
      }

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Couldn't read that image."));
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("That image couldn't be opened."));
          img.src = dataUrl;
        });

        const maxDimension = 800;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        let quality = 0.86;
        let compressed = canvas.toDataURL("image/jpeg", quality);
        while (compressed.length > 1_100_000 && quality > 0.45) {
          quality -= 0.1;
          compressed = canvas.toDataURL("image/jpeg", quality);
        }

        if (compressed.length > 1_100_000) {
          throw new Error("That image is too large to store. Please choose a smaller photo.");
        }

        updatePhoto(compressed);
        message.textContent = "Photo selected. Save your profile to keep it.";
      } catch (error) {
        message.textContent = error.message || "Couldn't process that photo.";
        photoInput.value = "";
      }
    });
  }

  if (removePhotoButton) {
    removePhotoButton.addEventListener("click", () => {
      updatePhoto("");
      if (photoInput) photoInput.value = "";
      message.textContent = "Photo removed from the form. Save your profile to confirm.";
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Saving profile...";

    const payload = {
      age: byId("profileAge").value,
      professionType: byId("profileProfession").value,
      college: byId("profileCollege").value,
      degree: byId("profileDegree").value,
      studyYear: byId("profileStudyYear").value,
      fieldOfStudy: byId("profileFieldOfStudy").value,
      location: byId("profileLocation").value,
      hobbies: byId("profileHobbies").value,
      bio: byId("profileBio").value,
      photoData
    };

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }
      if (!response.ok || !result.user) {
        throw new Error(result.message || "Unable to save your profile.");
      }

      user = result.user;
      photoData = user.photoData || "";
      if (publicToggle) publicToggle.checked = user.publicProfile === true;
      updatePhoto(photoData);
      updateSummary();
      updatePrivacyNote();
      message.textContent = "Profile saved successfully.";
    } catch (error) {
      message.textContent = error.message || "Unable to save your profile.";
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save profile";
    }
  });
}

// SKILLS TRACKER
function initializeSkillsTracker() {
  const form = document.getElementById("skillForm");
  if (!form) return;

  const message = document.getElementById("skillMessage");
  const button = document.getElementById("addSkillButton");
  const list = document.getElementById("skillsList");
  const loading = document.getElementById("skillsLoading");
  const summary = document.getElementById("skillSummary");

  async function loadSkills() {
    if (loading) loading.textContent = "Loading skills...";
    list.replaceChildren();

    try {
      const response = await fetch("/api/skills", {
        headers: { Accept: "application/json" }
      });

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load skills.");
      }

      const skills = result.skills || [];

      if (loading) {
        loading.textContent = skills.length
          ? `${skills.length} skill(s) saved.`
          : "No skills added yet. Add your first skill above!";
      }

      if (summary) {
        summary.textContent = `${skills.length} skill(s) added`;
      }

      if (skills.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "Your saved skills will appear here.";
        list.appendChild(emptyMessage);
        window.dispatchEvent(new Event("studentAnalyticsRefresh"));
        return;
      }

      skills.forEach((skill) => {
        const card = document.createElement("div");
        card.className = "skill-item";

        const title = document.createElement("h4");
        title.textContent = skill.name;

        const category = document.createElement("p");
        category.textContent = `Category: ${skill.category}`;

        const proficiency = document.createElement("p");
        proficiency.textContent = `Level: ${skill.proficiency}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${skill.name}`);

        deleteButton.addEventListener("click", async () => {
          if (!window.confirm(`Are you sure you want to delete "${skill.name}"?`)) {
            return;
          }

          deleteButton.disabled = true;
          deleteButton.textContent = "Deleting...";

          try {
            const deleteResponse = await fetch(
              `/api/skills/${encodeURIComponent(skill._id)}`,
              {
                method: "DELETE",
                headers: { Accept: "application/json" }
              }
            );

            const deleteResult = await deleteResponse.json();

            if (deleteResponse.status === 401) {
              window.location.replace("/login.html");
              return;
            }

            if (!deleteResponse.ok) {
              throw new Error(
                deleteResult.message || "Unable to delete skill."
              );
            }

            message.textContent = "Skill deleted successfully.";
            await loadSkills();
          } catch (error) {
            message.textContent = error.message;
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete";
          }
        });

        card.append(title, category, proficiency, deleteButton);
        list.appendChild(card);
      });
      window.dispatchEvent(new Event("studentAnalyticsRefresh"));
    } catch (error) {
      if (loading) loading.textContent = error.message;
      if (summary) summary.textContent = "Unable to load skills.";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("skillName").value.trim();
    const category = document.getElementById("skillCategory").value;
    const proficiency = document.getElementById("skillProficiency").value;

    message.textContent = "";
    button.disabled = true;
    button.textContent = "Adding...";

    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ name, category, proficiency })
      });

      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to add skill.");
      }

      form.reset();
      message.textContent = "Skill added successfully!";
      await loadSkills();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Add Skill";
    }
  });

  loadSkills();
}
// STUDENT COURSE CATALOGUE
function initializeCourses() {
  const list = document.getElementById("coursesList");
  if (!list) return;

  const loading = document.getElementById("coursesLoading");
  const summary = document.getElementById("courseSummary");
  const dashboardSummary = document.getElementById("dashboardCourseSummary");

  async function loadCourses() {
    if (loading) loading.textContent = "Loading courses...";
    list.replaceChildren();

    try {
      const response = await fetch("/api/courses", {
        headers: { Accept: "application/json" }
      });

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load courses.");
      }

      const courses = result.courses || [];
      let progressRows = [];
      try {
        const progressResponse = await fetch("/api/progress", { headers: { Accept: "application/json" } });
        if (progressResponse.ok) progressRows = (await progressResponse.json()).progress || [];
      } catch (error) { console.warn("Course progress could not be loaded.", error); }
      const completedCourseIds = new Set(progressRows.filter(row => row.status === "Completed").map(row => String(row.course)));

      if (summary) {
        summary.textContent = courses.length === 1
          ? "1 published course"
          : `${courses.length} published courses`;
      }

      if (dashboardSummary) {
        dashboardSummary.textContent = `${completedCourseIds.size} completed · ${courses.length} published course${courses.length === 1 ? "" : "s"} available`;
      }

      if (courses.length === 0) {
        if (loading) {
          loading.textContent = "No published courses yet. Check back soon.";
        }
        return;
      }

      if (loading) loading.textContent = "";

      courses.forEach((course) => {
        const card = document.createElement("article");
        card.className = "course-card dashboard-card";
        if (course._id) card.dataset.courseId = String(course._id);

        const title = document.createElement("h3");
        title.textContent = course.title;

        const description = document.createElement("p");
        description.textContent = course.description || "";

        const details = document.createElement("p");
        details.textContent =
          `${course.category || "General"} · ${course.level || "Beginner"}`;

        const lessons = Array.isArray(course.lessons) ? course.lessons : [];
        const count = course.lessonCount ?? lessons.length;

        const lessonCount = document.createElement("p");
        lessonCount.textContent =
          `${count} ${count === 1 ? "lesson" : "lessons"}`;

        const viewLessonsButton = document.createElement("button");
        viewLessonsButton.type = "button";
        viewLessonsButton.textContent = "View Lessons";

        const lessonsContainer = document.createElement("div");
        lessonsContainer.hidden = true;

        viewLessonsButton.addEventListener("click", () => {
          lessonsContainer.hidden = !lessonsContainer.hidden;
          viewLessonsButton.textContent = lessonsContainer.hidden
            ? "View Lessons"
            : "Hide Lessons";
        });

        if (lessons.length === 0) {
          const emptyLessons = document.createElement("p");
          emptyLessons.textContent = "Lessons coming soon.";
          lessonsContainer.appendChild(emptyLessons);
        } else {
          lessons.forEach((lesson, index) => {
            const lessonCard = document.createElement("section");
            lessonCard.className = "course-lesson";

            const lessonTitle = document.createElement("h4");
            lessonTitle.textContent = `${index + 1}. ${lesson.title}`;

            const lessonDescription = document.createElement("p");
            lessonDescription.textContent = lesson.description || "";

            lessonCard.append(lessonTitle, lessonDescription);

            if (lesson.videoUrl) {
              let videoId = "";

              try {
                const url = new URL(lesson.videoUrl);

                if (url.hostname === "youtu.be") {
                  videoId =
                    url.pathname.split("/").filter(Boolean)[0] || "";
                } else if (
                  [
                    "www.youtube.com",
                    "youtube.com",
                    "m.youtube.com"
                  ].includes(url.hostname)
                ) {
                  videoId =
                    url.searchParams.get("v") ||
                    url.pathname.split("/").filter(Boolean).pop() ||
                    "";
                }
              } catch {
                videoId = "";
              }

              if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
                videoId = "";
              }

              const videoHref = videoId
                ? `https://www.youtube.com/watch?v=${videoId}`
                : safeHttpUrl(lesson.videoUrl);
              if (videoHref) {
                const videoLink = document.createElement("a");
                videoLink.href = videoHref;
                videoLink.textContent = "▶ Watch lesson on YouTube";
                videoLink.target = "_blank";
                videoLink.rel = "noopener noreferrer";
                videoLink.style.display = "inline-block";
                videoLink.style.margin = "12px 0";
                videoLink.style.padding = "10px 16px";
                lessonCard.appendChild(videoLink);
              }
            }

            const resourceHref = safeHttpUrl(lesson.resourceUrl);
            if (resourceHref) {
              const resourceLink = document.createElement("a");
              resourceLink.href = resourceHref;
              resourceLink.textContent = "Open lesson resources";
              resourceLink.target = "_blank";
              resourceLink.rel = "noopener noreferrer";
              resourceLink.style.display = "block";
              resourceLink.style.margin = "8px 0";
              lessonCard.appendChild(resourceLink);
            }

            lessonsContainer.appendChild(lessonCard);
          });
        }

        const completionButton = document.createElement("button");
        completionButton.type = "button";
        completionButton.className = "course-completion-button";
        completionButton.textContent = completedCourseIds.has(String(course._id)) ? "Completed ✓" : "Mark course completed";
        completionButton.setAttribute("aria-pressed", String(completedCourseIds.has(String(course._id))));
        completionButton.addEventListener("click", async () => {
          completionButton.disabled = true;
          try {
            const done = completedCourseIds.has(String(course._id));
            const response = await fetch(`/api/progress/${encodeURIComponent(course._id)}/complete`, {
              method: done ? "DELETE" : "POST", headers: { Accept: "application/json" }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to update course status.");
            if (done) completedCourseIds.delete(String(course._id)); else completedCourseIds.add(String(course._id));
            completionButton.textContent = done ? "Mark course completed" : "Completed ✓";
            completionButton.setAttribute("aria-pressed", String(!done));
            if (dashboardSummary) dashboardSummary.textContent = `${completedCourseIds.size} completed · ${courses.length} published course${courses.length === 1 ? "" : "s"} available`;
            window.dispatchEvent(new Event("studentAnalyticsRefresh"));
          } catch (error) { alert(error.message); }
          finally { completionButton.disabled = false; }
        });
        card.append(title, description, details, lessonCount, viewLessonsButton, completionButton, lessonsContainer);

        if (course.instructor) {
          const instructor = document.createElement("p");
          instructor.textContent = `Instructor: ${course.instructor}`;
          card.appendChild(instructor);
        }

        list.appendChild(card);
      });
    } catch (error) {
      console.error("Course loading error:", error);

      if (loading) loading.textContent = error.message;
      if (summary) summary.textContent = "Unable to load courses.";

      if (dashboardSummary) {
        dashboardSummary.textContent =
          "Course information is temporarily unavailable.";
      }
    }
  }

  loadCourses();
}

// ADMIN COURSE CREATION
function initializeAdminCourseForm() {
  const form = document.getElementById("courseForm");
  if (!form) return;

  const button = document.getElementById("createCourseButton");
  const message = document.getElementById("courseFormMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const payload = {
      title: document.getElementById("courseTitle").value.trim(),
      description: document.getElementById("courseDescription").value.trim(),
      category: document.getElementById("courseCategory").value.trim(),
      level: document.getElementById("courseLevel").value,
      instructor: document.getElementById("courseInstructor").value.trim(),
      isPublished:
        document.getElementById("coursePublish").value === "true",
      lessons: []
    };

    button.disabled = true;
    button.textContent = "Creating...";

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      if (response.status === 403) {
        throw new Error("Administrator access is required.");
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to create course.");
      }

      form.reset();
      document.getElementById("courseCategory").value = "Programming";
      document.getElementById("coursePublish").value = "false";

      message.textContent = result.message || "Course created successfully.";

      await loadAdminCourses();

      if (payload.isPublished) {
        window.location.reload();
      }
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Create course";
    }
  });
}
// PROJECTS TRACKER
function initializeProjectsTracker() {
  const form = document.getElementById("projectForm");
  if (!form) return;

  const list = document.getElementById("projectsList");
  const loading = document.getElementById("projectsLoading");
  const message = document.getElementById("projectMessage");
  const heading = document.getElementById("projectFormHeading");
  const saveButton = document.getElementById("saveProjectButton");
  const cancelButton = document.getElementById("cancelProjectEdit");
  const dashboardSummary = document.getElementById("dashboardProjectSummary");

  let editingId = null;

  if (!list || !saveButton) return;

  function resetForm() {
    form.reset();
    editingId = null;

    if (heading) heading.textContent = "Add a Project";
    saveButton.textContent = "Save Project";
    if (cancelButton) cancelButton.hidden = true;
    if (message) message.textContent = "";
  }

  function addText(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function addSafeLink(parent, label, url) {
    if (!url) return;

    try {
      const parsed = new URL(url, window.location.origin);
      if (!["http:", "https:"].includes(parsed.protocol)) return;

      const link = document.createElement("a");
      link.href = parsed.href;
      link.textContent = label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "inline-block";
      link.style.marginRight = "12px";
      parent.appendChild(link);
    } catch {
      // Ignore invalid optional URLs.
    }
  }

  async function loadProjects() {
    if (loading) loading.textContent = "Loading projects...";
    list.replaceChildren();

    try {
      const response = await fetch("/api/projects", {
        headers: { Accept: "application/json" }
      });

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load projects.");
      }

      const projects = Array.isArray(result.projects)
        ? result.projects
        : Array.isArray(result)
          ? result
          : [];

      if (loading) {
        loading.textContent = projects.length
          ? `${projects.length} project(s) saved.`
          : "No projects added yet. Add your first project above!";
      }

      if (dashboardSummary) {
        dashboardSummary.textContent = projects.length
          ? `${projects.length} project(s) saved`
          : "Your projects and certificates will appear here.";
      }

      if (projects.length === 0) {
        addText(list, "p", "Your saved projects will appear here.");
        window.dispatchEvent(new Event("studentAnalyticsRefresh"));
        return;
      }

      projects.forEach((project) => {
        const card = document.createElement("article");
        card.className = "dashboard-card project-card";

        addText(card, "h4", project.title || "Untitled project");
        addText(card, "p", project.description || "No description provided.");

        if (
          Array.isArray(project.technologies) &&
          project.technologies.length
        ) {
          addText(
            card,
            "p",
            `Technologies: ${project.technologies.join(", ")}`
          );
        }

        if (project.completedAt) {
          const date = new Date(project.completedAt);

          if (!Number.isNaN(date.getTime())) {
            addText(card, "p", `Completed: ${date.toLocaleDateString()}`);
          }
        }

        const links = document.createElement("p");
        addSafeLink(links, "Open project / GitHub", project.projectUrl);
        addSafeLink(links, "View certificate", project.certificateUrl);

        if (links.childNodes.length) {
          card.appendChild(links);
        }

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.flexWrap = "wrap";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
          editingId = project._id;

          document.getElementById("projectTitle").value =
            project.title || "";

          document.getElementById("projectDescription").value =
            project.description || "";

          document.getElementById("projectTechnologies").value =
            Array.isArray(project.technologies)
              ? project.technologies.join(", ")
              : "";

          document.getElementById("projectUrl").value =
            project.projectUrl || "";

          document.getElementById("certificateUrl").value =
            project.certificateUrl || "";

          document.getElementById("projectCompletedAt").value =
            project.completedAt
              ? new Date(project.completedAt).toISOString().slice(0, 10)
              : "";

          if (heading) heading.textContent = "Edit Project";
          saveButton.textContent = "Update Project";

          if (cancelButton) cancelButton.hidden = false;

          if (message) {
            message.textContent =
              "Editing project. Save your changes when ready.";
          }

          form.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
          const confirmed = window.confirm(
            `Delete the project "${project.title || "Untitled project"}"?`
          );

          if (!confirmed) return;

          deleteButton.disabled = true;
          deleteButton.textContent = "Deleting...";

          try {
            const deleteResponse = await fetch(
              `/api/projects/${encodeURIComponent(project._id)}`,
              {
                method: "DELETE",
                headers: { Accept: "application/json" }
              }
            );

            const deleteResult = await deleteResponse.json();

            if (deleteResponse.status === 401) {
              window.location.replace("/login.html");
              return;
            }

            if (!deleteResponse.ok) {
              throw new Error(
                deleteResult.message || "Unable to delete project."
              );
            }

            if (message) {
              message.textContent = "Project deleted successfully.";
            }

            if (editingId === project._id) {
              resetForm();
            }

            await loadProjects();
          } catch (error) {
            if (message) {
              message.textContent =
                error.message || "Unable to delete project.";
            }

            deleteButton.disabled = false;
            deleteButton.textContent = "Delete";
          }
        });

        actions.append(editButton, deleteButton);
        card.appendChild(actions);
        list.appendChild(card);
      });
      window.dispatchEvent(new Event("studentAnalyticsRefresh"));
    } catch (error) {
      console.error("Project loading error:", error);

      if (loading) {
        loading.textContent = error.message || "Unable to load projects.";
      }

      if (dashboardSummary) {
        dashboardSummary.textContent = "Unable to load projects.";
      }
    }
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", resetForm);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (message) message.textContent = "";

    const technologies = document
      .getElementById("projectTechnologies")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      technologies.length > 30 ||
      technologies.some((item) => item.length > 50)
    ) {
      if (message) {
        message.textContent =
          "Enter up to 30 technologies, each no longer than 50 characters.";
      }
      return;
    }

    const payload = {
      title: document.getElementById("projectTitle").value.trim(),
      description: document
        .getElementById("projectDescription")
        .value.trim(),
      technologies,
      projectUrl: document.getElementById("projectUrl").value.trim(),
      certificateUrl: document.getElementById("certificateUrl").value.trim(),
      completedAt:
        document.getElementById("projectCompletedAt").value || null
    };

    saveButton.disabled = true;
    saveButton.textContent = editingId ? "Updating..." : "Saving...";

    try {
      const url = editingId
        ? `/api/projects/${encodeURIComponent(editingId)}`
        : "/api/projects";

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to save project.");
      }

      if (message) {
        message.textContent =
          result.message ||
          (editingId
            ? "Project updated successfully!"
            : "Project saved successfully!");
      }

      resetForm();
      await loadProjects();
    } catch (error) {
      if (message) {
        message.textContent = error.message || "Unable to save project.";
      }
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = editingId ? "Update Project" : "Save Project";
    }
  });

  loadProjects();
}


/* STUDENT INTERNSHIP APPLICATION TRACKER */
function initializeApplicationTracker() {
  const list = document.getElementById("applicationsList");
  const summary = document.getElementById("applicationsSummary");

  if (!list || !summary) return;

  const manageButton = document.getElementById("manageApplicationsButton");
  if (manageButton) manageButton.addEventListener("click", () => {
    list.hidden = !list.hidden;
    manageButton.textContent = list.hidden ? "Manage Applications" : "Hide Applications";
    if (!list.hidden) list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  async function loadApplications() {
    summary.textContent = "Loading your applications...";
    list.replaceChildren();

    try {
      const response = await fetch("/api/applications", {
        headers: { Accept: "application/json" }
      });

      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load your applications."
        );
      }

      const applications = result.applications || [];

      summary.textContent = applications.length
        ? `${applications.length} internship(s) in your tracker.`
        : "You haven't tracked any internships yet. Browse available internships and click Track Internship.";

      applications.forEach(application => {
        const internship = application.internship;

        const card = document.createElement("article");
        card.className = "dashboard-card";

        const title = document.createElement("h4");
        title.textContent = internship?.title || "Internship listing unavailable";

        const company = document.createElement("p");
        company.textContent = `Company: ${internship?.company || "Not specified"}`;

        const location = document.createElement("p");
        location.textContent = `Location: ${internship?.location || "Not specified"}`;


        const statusLabel = document.createElement("label");
        statusLabel.textContent = "Application status: ";

        const status = document.createElement("select");
        status.name = "applicationStatus";
        status.style.display = "block";
        status.style.marginTop = "8px";
        status.style.padding = "10px";
        status.style.minWidth = "220px";

        const statusOptions = [
          "Interested",
          "Applied",
          "Interview",
          "Offered",
          "Rejected",
          "Withdrawn"
        ];

        statusOptions.forEach(value => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          status.appendChild(option);
        });

        status.value = application.status || "Interested";
        statusLabel.appendChild(document.createTextNode(" "));
        statusLabel.appendChild(status);


        const date = document.createElement("p");
        date.textContent = application.appliedAt
          ? `Applied on: ${new Date(application.appliedAt).toLocaleDateString()}`
          : "Application date: Not recorded";

        const message = document.createElement("p");
        message.setAttribute("role", "status");

        status.addEventListener("change", async () => {
          status.disabled = true;
          message.textContent = "Updating status...";

          try {
            const updateResponse = await fetch(
              `/api/applications/${application._id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
                },
                body: JSON.stringify({ status: status.value })
              }
            );

            const updateResult = await updateResponse.json();

            if (!updateResponse.ok) {
              throw new Error(
                updateResult.message || "Unable to update status."
              );
            }

            application.status = updateResult.application.status;
            application.appliedAt = updateResult.application.appliedAt;

            date.textContent = application.appliedAt
              ? `Applied on: ${new Date(application.appliedAt).toLocaleDateString()}`
              : "Application date: Not recorded";

            message.textContent = "Status updated successfully.";
          } catch (error) {
            status.value = application.status || "Interested";
            message.textContent = error.message;
          } finally {
            status.disabled = false;
          }
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove from tracker";

        removeButton.addEventListener("click", async () => {
          if (!confirm("Remove this internship from your tracker?")) return;

          removeButton.disabled = true;

          try {
            const deleteResponse = await fetch(
              `/api/applications/${application._id}`,
              { method: "DELETE" }
            );

            const deleteResult = await deleteResponse.json();

            if (!deleteResponse.ok) {
              throw new Error(
                deleteResult.message || "Unable to remove internship."
              );
            }

            await loadApplications();
          } catch (error) {
            message.textContent = error.message;
            removeButton.disabled = false;
          }
        });

        card.append(
          title,
          company,
          location,
          statusLabel,
          date,
          message,
          removeButton
        );

        list.appendChild(card);
      });
    } catch (error) {
      summary.textContent = error.message;
    }
  }

  window.addEventListener("applicationsUpdated", loadApplications);

  loadApplications();
}


// SECTION NAVIGATION — keeps dashboard views separate
function initializeSectionNavigation() {
  const main = document.querySelector("main");
  if (!main) return;

  // Only run dashboard navigation on the dashboard page.
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  const sections = Array.from(main.children).filter(
    (element) => element.tagName === "SECTION"
  );

  const adminLink = document.getElementById("adminNavLink");

  function showActiveSection() {
    const requestedId = window.location.hash.slice(1);
    const sectionId = requestedId === "socialFeed" ? "community" : requestedId;

    let activeSection = sections.find(
      (section) => section.id === sectionId
    );

    if (!activeSection) {
      activeSection = dashboard;
    }

    if (
      activeSection.id === "adminCourses" &&
      (!adminLink || adminLink.hidden)
    ) {
      activeSection = dashboard;
    }

    sections.forEach((section) => {
      const isActive = section === activeSection;
      section.hidden = !isActive;
      section.classList.toggle("is-active", isActive);
    });

    document.querySelectorAll('body > header nav a[aria-current="page"]').forEach((item) => item.removeAttribute("aria-current"));
    const activeNav = document.querySelector(`body > header nav a[href="#${requestedId}"]`) ||
      document.querySelector(`body > header nav a[href="#${activeSection.id}"]`);
    if (activeNav) activeNav.setAttribute("aria-current", "page");

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showActiveSection);
  showActiveSection();
}
/* INTERNSHIP MANAGEMENT */
function initializeInternships() {
  const form = document.getElementById("internshipForm");
  const adminSection = document.getElementById("adminInternshipManagement");

  if (!document.getElementById("internshipsList")) return;

  async function loadInternships() {
    const loading = document.getElementById("internshipsLoading");
    const list = document.getElementById("internshipsList");
    const adminLoading = document.getElementById("adminInternshipsLoading");
    const adminList = document.getElementById("adminInternshipsList");

    if (loading) loading.textContent = "Loading internships...";
    if (adminLoading) adminLoading.textContent = "Loading all internships...";
    if (list) list.replaceChildren();
    if (adminList) adminList.replaceChildren();

    try {
      const profileResponse = await fetch("/api/auth/me", {
        headers: { Accept: "application/json" }
      });

      if (profileResponse.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      const profile = await profileResponse.json();

      if (!profileResponse.ok || !profile.user) {
        throw new Error(profile.message || "Unable to verify your account.");
      }

      const isAdmin = profile.user.role === "admin";

      if (adminSection) adminSection.hidden = !isAdmin;

      const response = await fetch(
        isAdmin ? "/api/internships?all=true" : "/api/internships",
        { headers: { Accept: "application/json" } }
      );

      const result = await response.json();

      if (response.status === 401) {
        window.location.replace("/login.html");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to load internships.");
      }

      const internships = result.internships || [];
      const activeInternships = internships.filter(item => item.isActive);

      renderInternshipCards(activeInternships, list, false);

      if (loading) {
        loading.textContent = activeInternships.length
          ? `${activeInternships.length} available internship(s).`
          : "No active internships available right now.";
      }

      if (isAdmin) {
        renderInternshipCards(internships, adminList, true);

        if (adminLoading) {
          adminLoading.textContent = internships.length
            ? `${internships.length} internship listing(s) in total.`
            : "No internships created yet.";
        }
      }
    } catch (error) {
      console.error("Internship loading error:", error);

      if (loading) loading.textContent = error.message;
      if (adminLoading) adminLoading.textContent = error.message;
    }
  }

  function renderInternshipCards(internships, container, isAdmin) {
    if (!container) return;

    container.replaceChildren();

    internships.forEach(internship => {
      const card = document.createElement("article");
      card.className = "dashboard-card internship-card";
      if (internship._id) card.dataset.internshipId = String(internship._id);

      const title = document.createElement("h3");
      title.textContent = internship.title || "Untitled internship";

      const company = document.createElement("p");
      company.textContent = `Company: ${internship.company || "Not specified"}`;

      const location = document.createElement("p");
      location.textContent =
        `Location: ${internship.location || "Not specified"}`;

      const mode = document.createElement("p");
      mode.textContent = `Work mode: ${internship.workMode || "Not specified"}`;

      const description = document.createElement("p");
      description.textContent = internship.description || "";

      const skills = document.createElement("p");
      const requiredSkills = Array.isArray(internship.requiredSkills)
        ? internship.requiredSkills
        : [];
      skills.textContent = requiredSkills.length
        ? `Required skills: ${requiredSkills.join(", ")}`
        : "Required skills: Not specified";

      const deadline = document.createElement("p");
      deadline.textContent = internship.deadline
        ? `Deadline: ${new Date(internship.deadline).toLocaleDateString()}`
        : "Deadline: Not specified";

      card.append(title, company, location, mode, description, skills, deadline);

      if (isAdmin) {
        const status = document.createElement("p");
        status.textContent = internship.isActive
          ? "Status: Active"
          : "Status: Inactive";
        card.appendChild(status);
      }


      if (!isAdmin) {
        const trackButton = document.createElement("button");
        trackButton.type = "button";
        trackButton.textContent = "Track Internship";

        trackButton.addEventListener("click", async () => {
          trackButton.disabled = true;

          try {
            const response = await fetch("/api/applications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
              },
              body: JSON.stringify({
                internshipId: internship._id,
                status: "Interested"
              })
            });

            const result = await response.json();

            if (response.status === 401) {
              window.location.replace("/login.html");
              return;
            }

            if (!response.ok) {
              throw new Error(
                result.message || "Unable to track this internship."
              );
            }

            trackButton.textContent = "Added to Tracker";
            window.dispatchEvent(new Event("applicationsUpdated"));
          } catch (error) {
            alert(error.message);
            trackButton.disabled = false;
          }
        });

        card.appendChild(trackButton);
      }

      const applicationHref = safeHttpUrl(internship.applicationUrl);
      if (applicationHref) {
        const link = document.createElement("a");
        link.href = applicationHref;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View application page";
        card.appendChild(link);
      }


      container.appendChild(card);
    });
  }

  if (form) {
    const button = document.getElementById("saveInternshipButton");
    const message = document.getElementById("internshipFormMessage");

    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (message) message.textContent = "";
      if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
      }

      const payload = {
        title: document.getElementById("internshipTitle").value.trim(),
        company: document.getElementById("internshipCompany").value.trim(),
        description: document.getElementById("internshipDescription").value.trim(),
        location: document.getElementById("internshipLocation").value.trim(),
        workMode: document.getElementById("internshipWorkMode").value,
        requiredSkills: document.getElementById("internshipSkills").value
          .split(",")
          .map(skill => skill.trim())
          .filter(Boolean),
        applicationUrl: document.getElementById("internshipApplicationUrl").value.trim(),
        deadline: document.getElementById("internshipDeadline").value || null,
        isActive: document.getElementById("internshipIsActive").value === "true"
      };

      try {
        const response = await fetch("/api/internships", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.status === 401) {
          window.location.replace("/login.html");
          return;
        }

        if (response.status === 403) {
          throw new Error("Administrator access is required.");
        }

        if (!response.ok) {
          throw new Error(result.message || "Unable to save internship.");
        }

        form.reset();
        document.getElementById("internshipWorkMode").value = "Not specified";
        document.getElementById("internshipIsActive").value = "true";

        if (message) {
          message.textContent =
            result.message || "Internship created successfully.";
        }

        await loadInternships();
      } catch (error) {
        if (message) message.textContent = error.message;
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Save Internship";
        }
      }
    });
  }

  loadInternships();
}

/* Render account-derived career charts without external chart dependencies. */
function renderCareerActivityCharts(metricDefs, counts, maxCount) {
  const radarHost = document.getElementById("careerRadarChart");
  const barHost = document.getElementById("careerBarChart");
  if (!radarHost || !barHost) return;
  const labels = metricDefs.map(([, title]) => title.replace(" completed", "").replace(" listed", "").replace(" tracked", ""));
  const values = metricDefs.map(([key]) => Number(counts[key]) || 0);
  const chartMax = Math.max(1, ...values);
  const cx = 180, cy = 150, radius = 105, levels = 5;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / labels.length);
    const r = radius * value;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const polygon = points => points.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 360 310");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Radar chart of relative counts across six career activity categories");
  for (let level = 1; level <= levels; level++) {
    const ring = document.createElementNS(ns, "polygon");
    ring.setAttribute("points", polygon(labels.map((_, i) => point(i, level / levels))));
    ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "#d8e1e8"); ring.setAttribute("stroke-width", "1");
    svg.appendChild(ring);
  }
  labels.forEach((label, i) => {
    const [x, y] = point(i, 1);
    const axis = document.createElementNS(ns, "line");
    axis.setAttribute("x1", cx); axis.setAttribute("y1", cy); axis.setAttribute("x2", x); axis.setAttribute("y2", y);
    axis.setAttribute("stroke", "#cbd6de"); svg.appendChild(axis);
    const [tx, ty] = point(i, 1.19);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", tx); text.setAttribute("y", ty + (i === 0 ? 3 : 4));
    text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "10"); text.setAttribute("fill", "#52616d");
    text.textContent = label.length > 15 ? label.replace("Internships", "Internships") : label;
    svg.appendChild(text);
  });
  const profile = document.createElementNS(ns, "polygon");
  /* Preserve the correct axis index even when multiple categories share a count. */
  profile.setAttribute("points", polygon(values.map((v, i) => point(i, v / chartMax))));
  profile.setAttribute("fill", "#a77b3d"); profile.setAttribute("fill-opacity", ".16");
  profile.setAttribute("stroke", "#a77b3d"); profile.setAttribute("stroke-width", "2"); svg.appendChild(profile);
  values.forEach((v, i) => {
    const [x, y] = point(i, v / chartMax);
    const dot = document.createElementNS(ns, "circle"); dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "3.5"); dot.setAttribute("fill", "#a77b3d"); svg.appendChild(dot);
  });
  radarHost.replaceChildren(svg);
  const bars = document.createDocumentFragment();
  metricDefs.forEach(([key, title]) => {
    const value = Number(counts[key]) || 0;
    const row = document.createElement("div"); row.className = "career-bar-row";
    const label = document.createElement("span"); label.className = "career-bar-label"; label.textContent = title;
    const track = document.createElement("div"); track.className = "career-bar-track";
    track.setAttribute("aria-label", `${title}: ${value}`); track.setAttribute("role", "img");
    const fill = document.createElement("span"); fill.className = "career-bar-fill"; fill.style.width = `${value === 0 ? 0 : value / chartMax * 100}%`; track.appendChild(fill);
    const number = document.createElement("span"); number.className = "career-bar-value"; number.textContent = String(value);
    row.append(label, track, number); bars.appendChild(row);
  });
  barHost.replaceChildren(bars);
}

/* DATA-DRIVEN DASHBOARD ANALYTICS */
function initializeStudentAnalytics() {
  const grid = document.getElementById("analyticsGrid");
  if (!grid) return;
  const metricDefs = [
    ["completedCourses", "Courses completed", "Courses you marked as completed"],
    ["skillsShared", "Skills shared", "Skills visible on your public profile"],
    ["projectsCompleted", "Projects completed", "Projects with a completion date"],
    ["certificates", "Certificates listed", "Projects with a certificate link"],
    ["internshipsApplied", "Internships applied", "Applications marked Applied or later"],
    ["applications", "Applications tracked", "Internships saved to your tracker"]
  ];
  async function load() {
    grid.replaceChildren();
    const loading = document.createElement("p"); loading.className = "analytics-loading"; loading.textContent = "Updating your analytics…"; grid.appendChild(loading);
    try {
      const endpoints = ["/api/progress", "/api/skills", "/api/projects", "/api/applications", "/api/auth/me"];
      const responses = await Promise.all(endpoints.map(url => fetch(url, { headers: { Accept: "application/json" } })));
      if (responses.some(r => r.status === 401)) { window.location.replace("/login.html"); return; }
      const values = await Promise.all(responses.map(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.message || "Analytics data unavailable."); return data; }));
      const progress = values[0].progress || [], skills = values[1].skills || [], projects = values[2].projects || [], applications = values[3].applications || [], user = values[4].user || {};
      const counts = {
        completedCourses: progress.filter(p => p.status === "Completed").length,
        skillsShared: user.publicProfile ? skills.length : 0,
        projectsCompleted: projects.filter(p => !!p.completedAt).length,
        certificates: projects.filter(p => typeof p.certificateUrl === "string" && p.certificateUrl.trim()).length,
        internshipsApplied: applications.filter(a => ["Applied", "Interview", "Offered", "Rejected"].includes(a.status)).length,
        applications: applications.length
      };
      const max = Math.max(1, ...Object.values(counts));
      renderCareerActivityCharts(metricDefs, counts, max);
      grid.replaceChildren();
      metricDefs.forEach(([key, title, description]) => {
        const card = document.createElement("article"); card.className = "analytics-metric";
        const top = document.createElement("div"); top.className = "analytics-metric-top";
        const heading = document.createElement("h4"); heading.textContent = title;
        const value = document.createElement("strong"); value.textContent = String(counts[key]); value.setAttribute("aria-label", `${counts[key]} ${title.toLowerCase()}`);
        top.append(heading, value);
        const note = document.createElement("p"); note.textContent = description;
        const track = document.createElement("div"); track.className = "metric-track"; track.setAttribute("role", "img"); track.setAttribute("aria-label", `${title}: ${counts[key]}`);
        const bar = document.createElement("span"); bar.className = "metric-bar"; bar.style.width = `${counts[key] === 0 ? 0 : Math.max(8, Math.round(counts[key] / max * 100))}%`; track.appendChild(bar);
        card.append(top, note, track); grid.appendChild(card);
      });
    } catch (error) { grid.replaceChildren(); const p = document.createElement("p"); p.className = "analytics-loading"; p.textContent = `Analytics unavailable: ${error.message}`; grid.appendChild(p); }
  }
  load(); window.addEventListener("studentAnalyticsRefresh", load); window.addEventListener("profileVisibilityChanged", load); window.addEventListener("applicationsUpdated", load);
}

function navigateToAppSection(sectionId) {
  const requestedId = String(sectionId || "dashboard").replace(/^#/, "");
  // The sidebar's Community Feed link targets a nested section; its visible
  // top-level panel is #community. Keep the URL and selected link meaningful.
  const targetId = requestedId === "socialFeed" ? "community" : requestedId;
  const main = document.querySelector("main");
  if (!main) return;
  const sections = Array.from(main.children).filter(el => el.tagName === "SECTION");
  const target = sections.find(s => s.id === targetId);
  if (!target) return;

  document.body.classList.remove("mobile-nav-open", "search-sheet-open");
  sections.forEach(s => {
    const active = s === target;
    s.hidden = !active;
    s.classList.toggle("is-active", active);
  });

  if (window.location.hash !== `#${requestedId}`) {
    window.history.pushState(null, "", `#${requestedId}`);
  }

  document.querySelectorAll('body > header nav a[aria-current="page"]').forEach(item => item.removeAttribute("aria-current"));
  const activeNav = document.querySelector(`body > header nav a[href="#${requestedId}"]`) ||
    document.querySelector(`body > header nav a[href="#${targetId}"]`);
  if (activeNav) activeNav.setAttribute("aria-current", "page");

  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function openCourseDetailFromSearch(courseId) {
  navigateToAppSection("learning");
  window.setTimeout(() => {
    const card = courseId ? document.querySelector(`#coursesList [data-course-id="${CSS.escape(String(courseId))}"]`) : null;
    if (card) {
      const btn = card.querySelector("button");
      const lessonsDiv = card.querySelector("div");
      if (lessonsDiv && lessonsDiv.hidden && btn) btn.click();
      card.classList.add("search-Target-highlight");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => card.classList.remove("search-Target-highlight"), 2600);
    }
  }, 120);
}

function openInternshipDetailFromSearch(internshipId) {
  navigateToAppSection("internships");
  window.setTimeout(() => {
    const card = internshipId ? document.querySelector(`#internshipsList [data-internship-id="${CSS.escape(String(internshipId))}"]`) : null;
    if (card) {
      card.classList.add("search-Target-highlight");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => card.classList.remove("search-Target-highlight"), 2600);
    }
  }, 120);
}

function initializeDashboardQuickSearch() {
  const form = document.getElementById("dashboardQuickSearch");
  if (!form) return;
  const quickInput = document.getElementById("dashboardQuickSearchInput");
  const target = document.getElementById("communitySearchInput");
  const targetForm = document.getElementById("communitySearchForm");
  const sheet = document.getElementById("community");
  const closeButton = document.getElementById("closeCommunitySheet");
  const recentWrap = document.getElementById("dashboardRecentSearches");
  const recentItems = document.getElementById("dashboardRecentSearchItems");
  const clearRecent = document.getElementById("clearRecentSearches");
  const RECENT_KEY = "studentTrackerRecentSearches";
  const readRecent = () => { try { const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(value) ? value.filter(x => typeof x === "string").slice(0, 6) : []; } catch (_) { return []; } };
  const saveRecent = value => { const items = [value, ...readRecent().filter(x => x.toLowerCase() !== value.toLowerCase())].slice(0, 6); try { localStorage.setItem(RECENT_KEY, JSON.stringify(items)); } catch (_) {} renderRecent(); };
  const renderRecent = () => {
    if (!recentWrap || !recentItems) return;
    const items = readRecent();
    recentItems.replaceChildren();
    recentWrap.hidden = true; // Recent searches are opt-in: open only on an intentional click.
    items.forEach(value => { const b = document.createElement("button"); b.type = "button"; b.className = "recent-search-item"; b.textContent = "⌕  " + value; b.addEventListener("click", () => { if (quickInput) quickInput.value = value; if (recentWrap) recentWrap.hidden = true; runSearch(value); }); recentItems.appendChild(b); });
  };
  const openSearchResultsPage = () => {
    if (recentWrap) recentWrap.hidden = true;
    navigateToAppSection("community");
    if (sheet) {
      sheet.hidden = false;
      sheet.removeAttribute("aria-hidden");
    }
  };
  const closeSheet = () => {
    document.body.classList.remove("search-sheet-open");
  };
  const runSearch = value => {
    value = (value || "").trim();
    if (value.length < 2) {
      if (quickInput) { quickInput.setCustomValidity("Enter at least 2 characters."); quickInput.reportValidity(); quickInput.focus(); }
      return;
    }
    if (quickInput) quickInput.setCustomValidity("");
    saveRecent(value);
    if (target && targetForm) {
      target.value = value;
      openSearchResultsPage();
      window.requestAnimationFrame(() => {
        if (typeof targetForm.requestSubmit === "function") targetForm.requestSubmit();
        else targetForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    }
  };
  form.addEventListener("submit", event => {
    event.preventDefault();
    runSearch((quickInput?.value || "").trim());
  });
  if (quickInput) {
    // Clicking the search field explicitly opens history; keyboard focus alone does not.
    quickInput.addEventListener("click", () => {
      renderRecent();
      if (recentWrap && readRecent().length) recentWrap.hidden = false;
    });
    quickInput.addEventListener("focus", () => { if (recentWrap) recentWrap.hidden = true; });
    quickInput.addEventListener("input", () => { quickInput.setCustomValidity(""); if (recentWrap) recentWrap.hidden = true; });
    quickInput.addEventListener("keydown", event => { if (event.key === "Escape" && recentWrap) recentWrap.hidden = true; });
  }
  if (clearRecent) clearRecent.addEventListener("click", () => { try { localStorage.removeItem(RECENT_KEY); } catch (_) {} renderRecent(); });
  document.addEventListener("click", event => { if (recentWrap && !recentWrap.contains(event.target) && !form.contains(event.target)) recentWrap.hidden = true; });
  renderRecent();
  if (closeButton) closeButton.addEventListener("click", () => navigateToAppSection("dashboard"));

  const toggle = document.getElementById("dashboardSidebarToggle");
  const sidebar = document.querySelector("body > header");
  const mobileNavigation = window.matchMedia("(max-width: 760px)");
  if (toggle && mobileNavigation.matches) {
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    toggle.title = "Open navigation menu";
  }
  const closeMobileNavigation = () => {
    document.body.classList.remove("mobile-nav-open");
    if (toggle && mobileNavigation.matches) {
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      toggle.title = "Open navigation menu";
    }
  };
  if (toggle) toggle.addEventListener("click", () => {
    if (mobileNavigation.matches) {
      const opened = document.body.classList.toggle("mobile-nav-open");
      toggle.setAttribute("aria-pressed", String(opened));
      toggle.setAttribute("aria-label", opened ? "Close navigation menu" : "Open navigation menu");
      toggle.title = opened ? "Close navigation menu" : "Open navigation menu";
      return;
    }
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    toggle.setAttribute("aria-pressed", String(collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    toggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    toggle.textContent = "☰";
  });
  if (sidebar) sidebar.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => { if (mobileNavigation.matches) closeMobileNavigation(); });
  });
  document.addEventListener("click", event => {
    if (!mobileNavigation.matches || !document.body.classList.contains("mobile-nav-open")) return;
    if (sidebar && !sidebar.contains(event.target) && toggle && !toggle.contains(event.target)) closeMobileNavigation();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMobileNavigation(); });
  mobileNavigation.addEventListener("change", event => {
    document.body.classList.remove("mobile-nav-open");
    if (toggle) {
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", event.matches ? "Open navigation menu" : "Collapse sidebar");
      toggle.title = event.matches ? "Open navigation menu" : "Collapse sidebar";
    }
  });
  const profileButton = document.getElementById("dashboardProfileButton");
  if (profileButton) profileButton.addEventListener("click", () => {
    closeMobileNavigation();
    closeSheet();
    navigateToAppSection("profile");
  });
}

/* PUBLIC PEOPLE SEARCH, INTERNSHIP SEARCH AND PROFILE SOCIAL ACTIONS */
function initializeCommunitySearch() {
  const form = document.getElementById("communitySearchForm"); if (!form) return;
  const input = document.getElementById("communitySearchInput"), message = document.getElementById("communitySearchMessage"), people = document.getElementById("communityUsersResults"), jobs = document.getElementById("communityInternshipResults"), resultsColumns = document.getElementById("communityResultsColumns"), profileView = document.getElementById("publicProfileView"), button = document.getElementById("communitySearchButton");
  const safeUrl = value => { try { const u = new URL(value, window.location.origin); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
  const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };

  async function search(query) {
    if (!query.trim()) return;
    button.disabled = true;
    message.textContent = "Searching public profiles, courses, and active internships…";
    people.replaceChildren();
    jobs.replaceChildren();
    profileView.hidden = true;
    if (resultsColumns) resultsColumns.hidden = false;
    try {
      const response = await fetch(`/api/community/search?q=${encodeURIComponent(query.trim())}`, { headers: { Accept: "application/json" } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Search failed.");

      if (!result.users.length) people.appendChild(node("p", "No public profiles matched this search."));
      result.users.forEach(user => {
        const userId = user.id || user._id;
        const card = node("article", undefined, "community-result-card");
        const title = node("h5", user.name);
        title.style.cursor = "pointer";
        title.title = "View complete profile";
        title.addEventListener("click", () => loadPublicProfile(userId));
        card.appendChild(title);

        const headline = [user.degree, user.college, user.fieldOfStudy, user.location].filter(Boolean).join(" · ");
        if (headline) card.appendChild(node("p", headline));
        if (user.bio) card.appendChild(node("p", user.bio));

        const actions = node("div", undefined, "community-result-actions");
        const view = node("button", "View profile");
        view.type = "button";
        view.addEventListener("click", () => loadPublicProfile(userId));

        const follow = node("button", "Follow");
        follow.type = "button";
        follow.addEventListener("click", async () => {
          follow.disabled = true;
          try {
            const r = await fetch(`/api/social/follow/${encodeURIComponent(userId)}`, { method: "POST", headers: { Accept: "application/json" } });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message || "Unable to follow.");
            follow.textContent = d.status === "pending" ? "Request sent" : "Following";
          } catch (e) { follow.textContent = e.message; }
          finally { follow.disabled = false; }
        });

        const msgBtn = node("button", "Message");
        msgBtn.type = "button";
        msgBtn.addEventListener("click", () => {
          if (typeof window.openDirectMessagesForUser === "function") {
            window.openDirectMessagesForUser({ id: userId, name: user.name, photoData: user.photoData || "" });
          } else {
            const messages = document.getElementById("dashboardMessagesButton");
            if (messages) messages.click();
          }
        });

        const share = node("button", "Share profile");
        share.type = "button";
        share.addEventListener("click", () => shareText(`${window.location.origin}/index.html?profile=${encodeURIComponent(userId)}`));

        actions.append(view, follow, msgBtn, share);
        card.appendChild(actions);
        people.appendChild(card);
      });

      if (!result.internships.length && !(result.courses || []).length && !(result.skills || []).length) {
        jobs.appendChild(node("p", "No courses, skills or active internships matched this search."));
      }

      (result.courses || []).forEach(course => {
        const card = node("article", undefined, "community-result-card");
        const title = node("h5", `Course: ${course.title}`);
        title.style.cursor = "pointer";
        title.addEventListener("click", () => openCourseDetailFromSearch(course._id));
        card.appendChild(title);
        card.appendChild(node("p", `${course.category || "General"} · ${course.level || "Course"} · ${course.instructor || "Instructor not specified"}`));
        if (course.description) card.appendChild(node("p", course.description));
        if (Array.isArray(course.lessons) && course.lessons.length) card.appendChild(node("p", `${course.lessons.length} lesson(s) available`));
        const actions = node("div", undefined, "community-result-actions");
        const openCourseBtn = node("button", "Open course details");
        openCourseBtn.type = "button";
        openCourseBtn.addEventListener("click", () => openCourseDetailFromSearch(course._id));
        actions.appendChild(openCourseBtn);
        card.appendChild(actions);
        jobs.appendChild(card);
      });

      result.internships.forEach(job => {
        const card = node("article", undefined, "community-result-card");
        const title = node("h5", job.title);
        title.style.cursor = "pointer";
        title.addEventListener("click", () => openInternshipDetailFromSearch(job._id));
        card.appendChild(title);
        card.appendChild(node("p", `${job.company} · ${job.location || "Location not specified"} · ${job.workMode || "Work mode not specified"}`));
        card.appendChild(node("p", job.description || ""));
        const actions = node("div", undefined, "community-result-actions");
        const viewDetails = node("button", "View internship details");
        viewDetails.type = "button";
        viewDetails.addEventListener("click", () => openInternshipDetailFromSearch(job._id));
        actions.appendChild(viewDetails);

        const track = node("button", "Track internship");
        track.type = "button";
        track.addEventListener("click", async () => {
          track.disabled = true;
          try {
            const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ internshipId: job._id, status: 'Interested' }) });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message || 'Unable to track internship.');
            track.textContent = 'Added to tracker';
            window.dispatchEvent(new Event('studentAnalyticsRefresh'));
          } catch (e) { message.textContent = e.message; track.disabled = false; }
        });
        actions.appendChild(track);
        const link = safeUrl(job.applicationUrl);
        if (link) {
          const a = node('a', 'Application page');
          a.href = link;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          actions.appendChild(a);
        }
        card.appendChild(actions);
        jobs.appendChild(card);
      });

      (result.skills || []).forEach(skill => {
        const card = node("article", undefined, "community-result-card");
        card.appendChild(node("h5", `Skill: ${skill.name}`));
        card.appendChild(node("p", `${skill.category || "Other"} · ${skill.userCount} learner(s)`));
        const actions = node("div", undefined, "community-result-actions");
        const viewSkillsBtn = node("button", "Explore in Skills");
        viewSkillsBtn.type = "button";
        viewSkillsBtn.addEventListener("click", () => navigateToAppSection("skills"));
        actions.appendChild(viewSkillsBtn);
        card.appendChild(actions);
        jobs.appendChild(card);
      });

      message.textContent = `${result.users.length} public profile(s), ${result.internships.length} internship(s), ${(result.courses || []).length} course(s) and ${(result.skills || []).length} skill(s) found.`;
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  }

  async function shareText(text) {
    try {
      if (navigator.share) await navigator.share({ title: 'Student Tracker', url: text });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); message.textContent = 'Share link copied to clipboard.'; }
      else window.prompt('Copy this link', text);
    } catch (e) { if (e.name !== 'AbortError') { try { window.prompt('Copy this link', text); } catch {} } }
  }

  async function socialControls(container, type, id, shareUrl) {
    const actions = node('div', undefined, 'community-result-actions');
    const like = node('button', 'Like'); like.type = 'button';
    const comment = node('button', 'Comment'); comment.type = 'button';
    const share = node('button', 'Share'); share.type = 'button';
    actions.append(like, comment, share);
    container.appendChild(actions);
    const commentsWrap = node('div');
    container.appendChild(commentsWrap);
    async function refresh() {
      try {
        const r = await fetch(`/api/community/interactions/${type}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        like.textContent = `${d.liked ? 'Liked' : 'Like'} · ${d.likes}`;
        commentsWrap.replaceChildren();
        d.comments.forEach(c => {
          const row = node('div', undefined, 'social-comment');
          row.appendChild(node('strong', `${c.name}: `));
          row.appendChild(document.createTextNode(c.text));
          commentsWrap.appendChild(row);
        });
      } catch (e) { commentsWrap.appendChild(node('p', e.message)); }
    }
    like.addEventListener('click', async () => {
      like.disabled = true;
      try {
        const r = await fetch(`/api/community/interactions/${type}/${encodeURIComponent(id)}/like`, { method: 'POST', headers: { Accept: 'application/json' } });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        like.textContent = `${d.liked ? 'Liked' : 'Like'} · ${d.likes}`;
      } catch (e) { message.textContent = e.message; }
      finally { like.disabled = false; }
    });
    comment.addEventListener('click', async () => {
      const text = window.prompt('Write a comment (up to 500 characters):');
      if (!text || !text.trim()) return;
      try {
        const r = await fetch(`/api/community/interactions/${type}/${encodeURIComponent(id)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ text }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        await refresh();
      } catch (e) { message.textContent = e.message; }
    });
    share.addEventListener('click', () => shareText(shareUrl));
    await refresh();
  }

  async function loadPublicProfile(id) {
    if (!id) return;
    navigateToAppSection("community");
    if (resultsColumns) resultsColumns.hidden = true;
    profileView.hidden = false;
    profileView.classList.add('public-profile-page');
    profileView.replaceChildren(node('p', 'Loading public profile…'));
    try {
      const [r, sr] = await Promise.all([
        fetch(`/api/community/users/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } }),
        fetch(`/api/social/profile-stats/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } }).catch(() => null)
      ]);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Unable to load profile.');
      const stats = sr && sr.ok ? await sr.json() : { followers: 0, following: 0, skills: (d.skills || []).length, certificates: (d.certificates || []).length, isFollowing: false, requestPending: false };

      profileView.replaceChildren();

      const topNav = node('div', undefined, 'community-result-actions');
      topNav.style.marginBottom = '16px';
      const backBtn = node('button', '← Back to search results');
      backBtn.type = 'button';
      backBtn.addEventListener('click', () => {
        profileView.hidden = true;
        if (resultsColumns) resultsColumns.hidden = false;
      });
      topNav.appendChild(backBtn);
      profileView.appendChild(topNav);

      // Render complete visitor profile using the exact same two-column layout as My Profile
      const layout = node('div', undefined, 'profile-layout');
      const mainCol = node('div', undefined, 'profile-main-column');
      const railCol = node('aside', undefined, 'profile-action-rail');
      railCol.setAttribute('aria-label', 'Visitor profile actions and skills');

      // Summary card matching #profile .profile-summary
      const summaryCard = node('div', undefined, 'profile-summary dashboard-card');
      const avatarWrap = node('div', undefined, 'profile-avatar-wrap');
      const photoData = typeof d.user.photoData === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(d.user.photoData) ? d.user.photoData : '';
      if (photoData) {
        const img = node('img', undefined, 'profile-avatar');
        img.src = photoData;
        img.alt = (d.user.name || 'User') + ' profile photo';
        avatarWrap.appendChild(img);
      } else {
        const fallback = node('div', (d.user.name || 'U').trim().slice(0, 2).toUpperCase(), 'profile-avatar profile-avatar-fallback');
        avatarWrap.appendChild(fallback);
      }

      const summaryCopy = node('div', undefined, 'profile-summary-copy');
      summaryCopy.appendChild(node('h3', d.user.name || 'Public profile'));
      const headline = [d.user.degree, d.user.college, d.user.studyYear, d.user.fieldOfStudy, d.user.location].filter(Boolean).join(' · ');
      summaryCopy.appendChild(node('p', headline || 'Student Tracker Member'));
      if (d.user.bio) summaryCopy.appendChild(node('p', d.user.bio));

      const statsBar = node('div', undefined, 'profile-social-stats profile-social-stats-inline');
      const makeStat = (count, label) => {
        const wrap = node('div');
        const btn = node('div', undefined, 'profile-stat-button');
        btn.append(node('strong', String(count ?? 0)), node('span', label));
        wrap.appendChild(btn);
        return wrap;
      };
      statsBar.append(
        makeStat(stats.followers, 'Followers'),
        makeStat(stats.following, 'Following'),
        makeStat(stats.certificates ?? (d.certificates || []).length, 'Certificates')
      );

      summaryCard.append(avatarWrap, summaryCopy, statsBar);
      mainCol.appendChild(summaryCard);

      const shareUrl = `${window.location.origin}/index.html?profile=${encodeURIComponent(id)}`;

      // Certificate showcase card matching #profile .profile-certificate-feed
      const certSection = node('section', undefined, 'profile-certificate-feed dashboard-card');
      const certHeading = node('div', undefined, 'profile-card-heading');
      const certTitleWrap = node('div');
      certTitleWrap.append(node('h3', 'Certificate showcase'), node('p', `Verified credentials and project certificates shared by ${d.user.name || 'this member'}.`));
      certHeading.appendChild(certTitleWrap);
      certSection.appendChild(certHeading);

      const certList = node('div', undefined, 'certificate-feed-list');
      if (!d.certificates.length) {
        certList.appendChild(node('p', 'No certificate links are shared on this profile.'));
      } else {
        for (const cert of d.certificates) {
          const card = node('article', undefined, 'certificate-feed-card');
          card.appendChild(node('h4', cert.title || 'Certificate'));
          if (cert.description) card.appendChild(node('p', cert.description));
          const href = safeUrl(cert.certificateUrl);
          if (href) {
            const a = node('a', 'View certificate', 'certificate-view-link');
            a.href = href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            card.appendChild(a);
          }
          await socialControls(card, 'certificate', cert._id, href || shareUrl);
          certList.appendChild(card);
        }
      }
      certSection.appendChild(certList);
      mainCol.appendChild(certSection);

      // Posts section matching #profile .profile-posts-section
      const postsSection = node('section', undefined, 'profile-posts-section dashboard-card');
      if (window.StudentPosts && typeof window.StudentPosts.renderPublicProfile === 'function') {
        await window.StudentPosts.renderPublicProfile(postsSection, id);
      } else {
        postsSection.append(node('h3', 'Posts'), node('p', 'No posts available.'));
      }
      mainCol.appendChild(postsSection);

      // Right-hand visitor action rail matching My Profile's right-side action cards
      const connectCard = node('div', undefined, 'profile-terminal-card');
      const connectTop = node('div', undefined, 'profile-terminal-top');
      connectTop.append(node('span', undefined, 'profile-terminal-dot'), node('span', 'NETWORK / CONNECT'));
      const followBtn = node('button', undefined, 'profile-terminal-action');
      followBtn.type = 'button';
      const updateFollowLabel = (label, symbol = '+') => {
        followBtn.replaceChildren(node('span', symbol), document.createTextNode(' ' + label));
      };
      updateFollowLabel(stats.isFollowing ? 'Unfollow' : (stats.requestPending ? 'Request pending' : 'Follow'), stats.isFollowing ? '✓' : '+');
      followBtn.disabled = Boolean(stats.requestPending);
      followBtn.addEventListener('click', async () => {
        followBtn.disabled = true;
        try {
          if (stats.isFollowing) {
            const rr = await fetch(`/api/social/follow/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!rr.ok) throw new Error('Unable to unfollow.');
            stats.isFollowing = false;
            updateFollowLabel('Follow', '+');
          } else {
            const rr = await fetch(`/api/social/follow/${encodeURIComponent(id)}`, { method: 'POST' });
            const dd = await rr.json();
            if (!rr.ok) throw new Error(dd.message || 'Unable to follow.');
            if (dd.status === 'pending') {
              stats.requestPending = true;
              updateFollowLabel('Request pending', '…');
            } else {
              stats.isFollowing = true;
              updateFollowLabel('Unfollow', '✓');
            }
          }
        } catch (e) { updateFollowLabel(e.message, '!'); }
        finally { if (!stats.requestPending) followBtn.disabled = false; }
      });
      connectCard.append(connectTop, node('h3', `Connect with ${d.user.name || 'Member'}`), node('p', 'Follow to stay updated on projects, certificates, and career milestones.'), followBtn);
      railCol.appendChild(connectCard);

      const messageCard = node('div', undefined, 'profile-terminal-card');
      const messageTop = node('div', undefined, 'profile-terminal-top');
      messageTop.append(node('span', undefined, 'profile-terminal-dot'), node('span', 'DIRECT / MESSAGE'));
      const messageBtn = node('button', undefined, 'profile-terminal-action');
      messageBtn.type = 'button';
      messageBtn.append(node('span', '✉'), document.createTextNode(' Message'));
      messageBtn.addEventListener('click', () => {
        if (typeof window.openDirectMessagesForUser === 'function') {
          window.openDirectMessagesForUser({ id, name: d.user.name || 'User', photoData });
        } else {
          const messages = document.getElementById('dashboardMessagesButton');
          if (messages) messages.click();
        }
      });
      messageCard.append(messageTop, node('h3', 'Send a message'), node('p', 'Open your direct messages panel to start or continue a conversation.'), messageBtn);
      railCol.appendChild(messageCard);

      const skillsCard = node('div', undefined, 'profile-terminal-card');
      const skillsTop = node('div', undefined, 'profile-terminal-top');
      skillsTop.append(node('span', undefined, 'profile-terminal-dot'), node('span', 'SKILLS / VERIFIED'));
      skillsCard.append(skillsTop, node('h3', 'Skills & proficiency'));
      const skillsWrap = node('div', undefined, 'public-skills');
      if (d.skills.length) {
        d.skills.forEach(s => skillsWrap.appendChild(node('span', `${s.name} · ${s.proficiency}`, 'public-skill')));
      } else {
        skillsWrap.appendChild(node('p', 'No skills listed yet.'));
      }
      skillsCard.appendChild(skillsWrap);
      await socialControls(skillsCard, 'profile', id, shareUrl);
      railCol.appendChild(skillsCard);

      layout.append(mainCol, railCol);
      profileView.appendChild(layout);
      profileView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      profileView.replaceChildren(node('p', e.message));
      profileView.hidden = false;
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    navigateToAppSection("community");
    search(input.value);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has('profile')) {
    input.value = '';
    loadPublicProfile(params.get('profile'));
  }
}


/* Profile statistics and certificate showcase; reuses existing APIs and Project records. */
async function initializeProfileShowcase() {
  const feed=document.getElementById("myCertificateFeed");
  if(!feed) return;
  const safeText=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const safeHref=value=>{try{const u=new URL(value,window.location.origin);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch{return "";}};
  try {
    const meResponse=await fetch("/api/auth/me",{headers:{Accept:"application/json"}});const meData=await meResponse.json();
    const user=meData.user||{};const id=user._id||user.id;
    if(id){try{const sr=await fetch(`/api/social/profile-stats/${encodeURIComponent(id)}`,{headers:{Accept:"application/json"}});if(sr.ok){const st=await sr.json();document.getElementById("myFollowersCount").textContent=st.followers??0;document.getElementById("myFollowingCount").textContent=st.following??0;document.getElementById("myCertificatesCount").textContent=st.certificates??0;}}catch(_){}}
    const response=await fetch("/api/projects",{headers:{Accept:"application/json"}});const result=await response.json();if(!response.ok)throw new Error(result.message||"Unable to load certificates.");
    const projects=(result.projects||[]).filter(p=>typeof p.certificateUrl==="string"&&p.certificateUrl.trim());feed.replaceChildren();
    if(!projects.length){feed.append(safeText("p","No certificates posted yet."));return;}
    for(const project of projects){const card=safeText("article",undefined,"certificate-feed-card");const head=safeText("div",undefined,"certificate-feed-author");
      const hasPhoto=typeof user.photoData==="string"&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(user.photoData);
      const avatar=hasPhoto?safeText("img",undefined,"certificate-feed-avatar"):safeText("span",(user.name||"U").trim().charAt(0).toUpperCase(),"certificate-feed-avatar");
      if(hasPhoto){avatar.src=user.photoData;avatar.alt=`${user.name||"Your profile"} profile photo`;avatar.loading="lazy";}
      const author=safeText("div",undefined,"certificate-feed-author-copy");author.append(safeText("strong",user.name||"Your profile"),safeText("small","Certificate / achievement"));head.append(avatar,author);card.append(head,safeText("h4",project.title||"Certificate"));if(project.description)card.append(safeText("p",project.description));
      const href=safeHref(project.certificateUrl);if(href){if(/\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(href)){const preview=safeText("img");preview.src=href;preview.alt=`Certificate image for ${project.title||"achievement"}`;preview.loading="lazy";preview.className="certificate-feed-image";card.append(preview);}const link=safeText("a","View certificate");link.href=href;link.target="_blank";link.rel="noopener noreferrer";link.className="certificate-view-link";card.append(link);}
      const actions=safeText("div",undefined,"certificate-feed-actions");const appreciate=safeText("button","☆ Appreciate");appreciate.type="button";const commentToggle=safeText("button","Comment");commentToggle.type="button";const share=safeText("button","Share");share.type="button";actions.append(appreciate,commentToggle,share);card.append(actions);
      const comments=safeText("div",undefined,"certificate-feed-comments");comments.hidden=true;const commentForm=safeText("form",undefined,"certificate-comment-form");const commentInput=safeText("input");commentInput.placeholder="Write a professional comment…";commentInput.maxLength=500;commentInput.required=true;commentInput.setAttribute("aria-label","Write a comment");const send=safeText("button","Post comment");send.type="submit";commentForm.append(commentInput,send);comments.append(commentForm);card.append(comments);
      const api=`/api/community/interactions/certificate/${encodeURIComponent(project._id)}`;
      async function refreshInteractions(){try{const r=await fetch(api,{headers:{Accept:"application/json"}});if(!r.ok)return;const d=await r.json();appreciate.textContent=`${d.liked?"★":"☆"} Appreciate${d.likes?` · ${d.likes}`:""}`;for(const c of d.comments||[]){const row=safeText("p",`${c.name}: ${c.text}`,"certificate-feed-comment");comments.insertBefore(row,commentForm);}}catch(_){}}
      appreciate.addEventListener("click",async()=>{appreciate.disabled=true;try{const r=await fetch(api+"/like",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:"{}"});const d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to appreciate this certificate.");appreciate.textContent=`${d.liked?"★":"☆"} Appreciate${d.likes?` · ${d.likes}`:""}`;}catch(e){appreciate.title=e.message;}finally{appreciate.disabled=false;}});
      commentToggle.addEventListener("click",()=>{comments.hidden=!comments.hidden;if(!comments.hidden)commentInput.focus();});
      commentForm.addEventListener("submit",async ev=>{ev.preventDefault();send.disabled=true;try{const r=await fetch(api+"/comments",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({text:commentInput.value})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to post comment.");comments.insertBefore(safeText("p",`${d.comment.name}: ${d.comment.text}`,"certificate-feed-comment"),commentForm);commentInput.value="";}catch(e){send.textContent=e.message;}finally{send.disabled=false;}});
      share.addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:project.title||"Certificate",text:project.description||"Professional certificate",url:href||window.location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(href||window.location.href);share.textContent="Link copied";}else share.textContent="Open certificate to share";}catch(_){}});
      feed.append(card);refreshInteractions();
    }
  }catch(e){feed.replaceChildren(safeText("p",e.message||"Certificate showcase is temporarily unavailable."));}
}
function initializeProfileConnections() {
  const feed = document.querySelector(".profile-certificate-feed");
  document.querySelectorAll(".profile-stat-button[data-profile-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.profileView;
      if (kind === "followers" || kind === "following") {
        window.location.href = `/connections.html?type=${encodeURIComponent(kind)}`;
        return;
      }
      if (feed) {
        feed.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start"
        });
        const heading = document.getElementById("certificateFeedTitle");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
    });
  });
}
document.addEventListener("DOMContentLoaded", initializeProfileConnections);
document.addEventListener("DOMContentLoaded",initializeProfileShowcase);

/* Persistent notification inbox and direct messages */
function initializeSocialInbox() {
  const panel = document.getElementById("socialInboxPanel");
  const content = document.getElementById("socialInboxContent");
  const title = document.getElementById("socialInboxTitle");
  const badge = document.getElementById("notificationUnreadBadge");
  const notificationButton = document.getElementById("dashboardNotificationButton");
  const messagesButton = document.getElementById("dashboardMessagesButton");
  const closeButton = document.getElementById("socialInboxClose");
  if (!panel || !content || !notificationButton || !messagesButton) return;
  let mode = "notifications";
  let currentUserId = null;
  fetch("/api/auth/me",{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{currentUserId=d.user?._id||d.user?.id||null;}).catch(()=>{});
  const el = (tag, text, cls) => { const node=document.createElement(tag); if(text!==undefined) node.textContent=text; if(cls) node.className=cls; return node; };
  async function request(url, options={}) {
    const response=await fetch(url,{headers:{Accept:"application/json","Content-Type":"application/json"},...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.message||"Request failed.");
    return data;
  }
  async function refreshBadge() {
    try { const data=await request("/api/social/notifications"); if(data.unread){badge.textContent=data.unread>99?"99+":String(data.unread);badge.hidden=false;}else badge.hidden=true; }
    catch (_) { badge.hidden=true; }
  }
  const ensurePanelVisible = () => {
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
    panel.hidden = false;
  };
  async function showNotifications() {
    mode="notifications"; title.textContent="Notifications"; content.replaceChildren(el("p","Loading…"));
    ensurePanelVisible();
    try {
      const data=await request("/api/social/notifications"); content.replaceChildren();
      if(!data.notifications.length) content.append(el("p","You're all caught up."));
      data.notifications.forEach(n=>{
        const item=el("article",undefined,"social-notification"+(n.readAt?"":" unread"));
        item.append(el("strong",n.title),el("p",n.body||""),el("small",new Date(n.createdAt).toLocaleString()));
        if(!n.readAt){const mark=el("button","Mark read","social-action");mark.type="button";mark.addEventListener("click",async()=>{await request("/api/social/notifications/read",{method:"PATCH",body:JSON.stringify({id:n.id||n._id})});item.classList.remove("unread");mark.remove();refreshBadge();});item.append(mark);}
        content.append(item);
      });
      try {
        const pending = await request("/api/social/follow-requests");
        if (pending.requests.length) {
          content.prepend(el("h4","Follow requests"));
          pending.requests.forEach(req => {
            const row=el("div",undefined,"social-notification");
            row.append(el("strong",req.user?.name||"User"),el("p",req.user?.college||"Wants to follow you."));
            const accept=el("button","Accept request","social-action");accept.type="button";
            accept.addEventListener("click",async()=>{accept.disabled=true;try{await request(`/api/social/follow-requests/${req.id}/accept`,{method:"POST",body:JSON.stringify({})});row.replaceChildren(el("p","Request accepted."));refreshBadge();}catch(e){row.append(el("p",e.message));accept.disabled=false;}});
            row.append(accept);content.prepend(row);
          });
        }
      } catch (_) {}
      if(data.unread) await request("/api/social/notifications/read",{method:"PATCH",body:JSON.stringify({})});
      refreshBadge();
    } catch(e){content.replaceChildren(el("p",e.message));}
  }
  async function showConversations(preselectUser = null) {
    mode="messages";title.textContent="Messages";content.replaceChildren(el("p","Loading…"));ensurePanelVisible();
    try {
      const data=await request("/api/social/conversations");content.replaceChildren();
      const layout=el("div",undefined,"social-message-layout");
      const list=el("div",undefined,"social-conversation-list");
      const thread=el("div",undefined,"social-message-thread");
      list.append(el("p","Choose a follower or connection to message."));
      let matchedUser = null;
      for(const user of data.conversations){
        if (preselectUser && String(user.id) === String(preselectUser.id)) matchedUser = user;
        const b=el("button",undefined,"social-conversation-button");b.type="button";
        const avatar=el("span",undefined,"social-conversation-avatar");
        if(typeof user.photoData==="string" && /^data:image\/(?:png|jpeg|webp);base64,/i.test(user.photoData)){const img=el("img");img.src=user.photoData;img.alt="";avatar.append(img);}else{avatar.textContent=(user.name||"U").trim().charAt(0).toUpperCase();}
        const copy=el("span",undefined,"social-conversation-copy");copy.append(el("strong",user.name||"User"),el("small",user.unread?`${user.unread} unread message(s)`:"Open conversation"));
        b.append(avatar,copy);if(user.unread)b.append(el("span",String(user.unread>99?"99+":user.unread),"social-conversation-unread"));
        b.addEventListener("click",()=>showThread(user,thread));list.append(b);
      }
      layout.append(list,thread);content.append(layout);
      if (preselectUser) {
        await showThread(matchedUser || preselectUser, thread);
      } else if(!data.conversations.length) {
        content.append(el("p","You can message users after you follow each other or one of you follows the other."));
      }
    } catch(e){content.replaceChildren(el("p",e.message));}
  }
  window.openDirectMessagesForUser = (user) => showConversations(user);
  function relativeMessageTime(date) {
    const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));
    if(seconds<60)return "just now";
    if(seconds<3600){const n=Math.floor(seconds/60);return n+" minute"+(n===1?"":"s")+" ago";}
    if(seconds<86400){const n=Math.floor(seconds/3600);return n+" hour"+(n===1?"":"s")+" ago";}
    const n=Math.floor(seconds/86400);return n+" day"+(n===1?"":"s")+" ago";
  }
  async function showThread(user,thread) {
    thread.replaceChildren();
    const threadHeading=el("div",undefined,"social-thread-heading");
    const threadAvatar=el("span",undefined,"social-conversation-avatar");
    if(typeof user.photoData==="string" && /^data:image\/(?:png|jpeg|webp);base64,/i.test(user.photoData)){const img=el("img");img.src=user.photoData;img.alt="";threadAvatar.append(img);}else threadAvatar.textContent=(user.name||"U").trim().charAt(0).toUpperCase();
    const headingCopy=el("div",undefined,"social-thread-heading-copy");
    headingCopy.append(el("h4",user.name||"User"));
    const lastActive = user.lastSeen ? new Date(user.lastSeen) : null;
    const isActive = user.isOnline === true || user.online === true;
    const statusText = isActive ? "Active now" : (lastActive && !Number.isNaN(lastActive.getTime())
      ? "Active " + relativeMessageTime(lastActive) : "Offline · status unavailable");
    const presence=el("small",statusText,"social-presence"+(isActive?" is-online":""));
    headingCopy.append(presence);
    threadHeading.append(threadAvatar,headingCopy);thread.append(threadHeading,el("p","Loading messages…"));
    try {
      const data=await request("/api/social/messages/"+user.id);thread.replaceChildren(threadHeading);
      const messages=el("div",undefined,"social-message-list");
      const appendMessage=(m,mine)=>{
        const wrap=el("div",undefined,"social-message-wrap");
        wrap.append(el("p",(mine?"You: ":"")+m.text,"social-message"+(mine?" mine":"")));
        if(m.createdAt){const date=new Date(m.createdAt);if(!Number.isNaN(date.getTime()))wrap.append(el("small",date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}),"social-message-time"));}
        messages.append(wrap);
      };
      data.messages.forEach(m=>appendMessage(m,String(m.sender)===String(currentUserId)));
      const form=el("form",undefined,"social-send-form"),input=el("input"),send=el("button","Send");
      input.placeholder="Write a message…";input.maxLength=4000;input.required=true;send.type="submit";form.append(input,send);
      form.addEventListener("submit",async ev=>{ev.preventDefault();const text=input.value.trim();if(!text)return;send.disabled=true;try{const result=await request("/api/social/messages/"+user.id,{method:"POST",body:JSON.stringify({text})});appendMessage(result.message||{text,createdAt:new Date().toISOString()},true);input.value="";messages.scrollTop=messages.scrollHeight;}catch(e){thread.append(el("p",e.message));}finally{send.disabled=false;}});
      thread.append(messages,form);
    } catch(e){thread.replaceChildren(el("h4",user.name),el("p",e.message));}
  }
  notificationButton.addEventListener("click",showNotifications);
  messagesButton.addEventListener("click",() => showConversations(null));
  closeButton?.addEventListener("click",()=>{panel.hidden=true;});
  refreshBadge();
}
document.addEventListener("DOMContentLoaded", initializeSocialInbox);


// ADMIN COURSE MANAGEMENT: load existing courses and manage lessons without replacing records.
async function loadAdminCourses() {
  const list = document.getElementById("adminCoursesList");
  const loading = document.getElementById("adminCoursesLoading");
  if (!list) return;
  list.replaceChildren();
  if (loading) loading.textContent = "Loading course catalogue…";
  const el = (tag, text, cls) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (cls) item.className = cls;
    return item;
  };
  const field = (labelText, value, name, tag = "input") => {
    const wrap = el("label", labelText);
    let input;
    if (tag === "textarea") input = document.createElement("textarea");
    else if (tag === "select") {
      input = document.createElement("select");
      [["false", "Draft"], ["true", "Published"]].forEach(([v, t]) => {
        const option = el("option", t); option.value = v; input.appendChild(option);
      });
    } else input = document.createElement("input");
    input.name = name;
    if (tag !== "select") input.value = value || "";
    else input.value = String(Boolean(value));
    wrap.appendChild(input);
    return { wrap, input };
  };
  try {
    const response = await fetch("/api/courses/admin", { headers: { Accept: "application/json" } });
    if (response.status === 401) { window.location.replace("/login.html"); return; }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load courses.");
    const courses = Array.isArray(result.courses) ? result.courses : [];
    if (loading) loading.textContent = courses.length ? `${courses.length} course(s) found.` : "No courses created yet.";
    if (!courses.length) return;

    courses.forEach(course => {
      const card = el("article", undefined, "dashboard-card admin-course-card");
      const heading = el("h4", course.title);
      const status = el("p", `${course.isPublished ? "Published" : "Draft"} · ${(course.lessons || []).length} lesson(s)`);
      card.append(heading, status);

      const editCourseButton = el("button", "Edit course details"); editCourseButton.type = "button";
      const editCourseForm = el("form", undefined, "admin-inline-form"); editCourseForm.hidden = true;
      const titleField = field("Course title", course.title, "title");
      const descField = field("Description", course.description, "description", "textarea");
      const categoryField = field("Category", course.category, "category");
      const levelField = field("Level", course.level, "level", "select");
      levelField.input.replaceChildren();
      ["Beginner", "Intermediate", "Advanced"].forEach(v => { const o = el("option", v); o.value = v; levelField.input.appendChild(o); });
      levelField.input.value = course.level || "Beginner";
      const instructorField = field("Instructor", course.instructor, "instructor");
      const publishedField = field("Publication status", course.isPublished, "isPublished", "select");
      editCourseForm.append(titleField.wrap, descField.wrap, categoryField.wrap, levelField.wrap, instructorField.wrap, publishedField.wrap);
      const saveCourse = el("button", "Save course changes"); saveCourse.type = "submit";
      const courseMessage = el("p"); courseMessage.setAttribute("role", "status"); editCourseForm.append(saveCourse, courseMessage);
      editCourseButton.addEventListener("click", () => { editCourseForm.hidden = !editCourseForm.hidden; });
      editCourseForm.addEventListener("submit", async event => {
        event.preventDefault(); saveCourse.disabled = true; courseMessage.textContent = "Saving…";
        try {
          const r = await fetch(`/api/courses/${encodeURIComponent(course._id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ title: titleField.input.value.trim(), description: descField.input.value.trim(), category: categoryField.input.value.trim(), level: levelField.input.value, instructor: instructorField.input.value.trim(), isPublished: publishedField.input.value === "true" }) });
          const d = await r.json(); if (!r.ok) throw new Error(d.message || "Unable to update course.");
          await loadAdminCourses();
          if (typeof initializeCourses === "function") window.dispatchEvent(new Event("studentAnalyticsRefresh"));
        } catch (e) { courseMessage.textContent = e.message; }
        finally { saveCourse.disabled = false; }
      });
      card.append(editCourseButton, editCourseForm);

      const addLessonButton = el("button", "Add lesson / YouTube link"); addLessonButton.type = "button";
      const lessonForm = el("form", undefined, "admin-inline-form"); lessonForm.hidden = true;
      const lessonTitle = field("Lesson title", "", "title"); lessonTitle.input.required = true; lessonTitle.input.maxLength = 200;
      const lessonDescription = field("Lesson description (optional)", "", "description", "textarea"); lessonDescription.input.maxLength = 1000;
      const video = field("YouTube URL", "", "videoUrl"); video.input.type = "url"; video.input.placeholder = "https://www.youtube.com/watch?v=...";
      const resource = field("Resource URL (optional)", "", "resourceUrl"); resource.input.type = "url"; resource.input.placeholder = "https://...";
      const addButton = el("button", "Save lesson"); addButton.type = "submit";
      const lessonMessage = el("p"); lessonMessage.setAttribute("role", "status");
      lessonForm.append(lessonTitle.wrap, lessonDescription.wrap, video.wrap, resource.wrap, addButton, lessonMessage);
      addLessonButton.addEventListener("click", () => { lessonForm.hidden = !lessonForm.hidden; });
      lessonForm.addEventListener("submit", async event => {
        event.preventDefault(); addButton.disabled = true; lessonMessage.textContent = "Saving lesson…";
        try {
          const r = await fetch(`/api/courses/${encodeURIComponent(course._id)}/lessons`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ title: lessonTitle.input.value.trim(), description: lessonDescription.input.value.trim(), videoUrl: video.input.value.trim(), resourceUrl: resource.input.value.trim() }) });
          const d = await r.json(); if (!r.ok) throw new Error(d.message || "Unable to add lesson.");
          await loadAdminCourses();
        } catch (e) { lessonMessage.textContent = e.message; }
        finally { addButton.disabled = false; }
      });
      card.append(addLessonButton, lessonForm);

      const lessons = el("div", undefined, "admin-course-lessons");
      (course.lessons || []).forEach((lesson, index) => {
        const row = el("section", undefined, "course-lesson");
        row.appendChild(el("h5", `${index + 1}. ${lesson.title}`));
        row.appendChild(el("p", lesson.videoUrl || "No YouTube URL added"));
        if (lesson.description) row.appendChild(el("p", lesson.description));
        const editLessonButton = el("button", "Edit lesson"); editLessonButton.type = "button";
        const editLessonForm = el("form", undefined, "admin-inline-form"); editLessonForm.hidden = true;
        const et = field("Lesson title", lesson.title, "title"); et.input.required = true; et.input.maxLength = 200;
        const ed = field("Description", lesson.description, "description", "textarea"); ed.input.maxLength = 1000;
        const ev = field("YouTube URL", lesson.videoUrl, "videoUrl"); ev.input.type = "url";
        const er = field("Resource URL", lesson.resourceUrl, "resourceUrl"); er.input.type = "url";
        const saveLesson = el("button", "Save lesson changes"); saveLesson.type = "submit";
        const editMessage = el("p"); editMessage.setAttribute("role", "status");
        editLessonForm.append(et.wrap, ed.wrap, ev.wrap, er.wrap, saveLesson, editMessage);
        editLessonButton.addEventListener("click", () => { editLessonForm.hidden = !editLessonForm.hidden; });
        editLessonForm.addEventListener("submit", async event => {
          event.preventDefault(); saveLesson.disabled = true; editMessage.textContent = "Saving…";

          try {
            const r = await fetch(`/api/courses/${encodeURIComponent(course._id)}/lessons/${encodeURIComponent(lesson._id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ title: et.input.value.trim(), description: ed.input.value.trim(), videoUrl: ev.input.value.trim(), resourceUrl: er.input.value.trim() }) });
            const d = await r.json(); if (!r.ok) throw new Error(d.message || "Unable to update lesson.");
            await loadAdminCourses();
          } catch (e) { editMessage.textContent = e.message; }
          finally { saveLesson.disabled = false; }
        });
        row.append(editLessonButton, editLessonForm); lessons.appendChild(row);
      });
      if (!(course.lessons || []).length) lessons.appendChild(el("p", "No lessons yet. Use “Add lesson / YouTube link” to add the first one."));
      card.appendChild(lessons); list.appendChild(card);
    });
  } catch (error) {
    if (loading) loading.textContent = error.message || "Unable to load course catalogue.";
  }
}


// Scroll reveal uses static CSS in /css/style.css so it is not dependent on runtime style injection.
(() => {
  const startScrollReveal = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window) || !document.body) return;
    const selector = [
      "#dashboard > *", "#socialFeed > *", "#learning > *", "#skills > *", "#projects > *",
      "#internships > *", "#profile > *", "#community > *", "#adminCourses > *",
      ".dashboard-card", ".dashboard-grid", ".course-card", ".skill-card",
      ".project-card", ".internship-card", ".application-card", ".certificate-card",
      ".analytics-card", ".analytics-metric", ".social-inbox-panel", ".community-panel",
      ".social-post-card", ".profile-posts-section"
    ].join(",");
    const observed = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("abi-scroll-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.03, rootMargin: "0px 0px -18px 0px" });
    const scan = (root) => {
      if (!(root instanceof Element || root instanceof Document)) return;
      const items = [];
      if (root instanceof Element && root.matches(selector)) items.push(root);
      if (root.querySelectorAll) items.push(...root.querySelectorAll(selector));
      items.forEach((item) => {
        if (observed.has(item) || item.hidden || item.closest("[hidden]")) return;
        observed.add(item);
        item.classList.add("abi-scroll-reveal");
        observer.observe(item);
      });
    };
    scan(document);
    const mutations = new MutationObserver((records) => records.forEach((record) => {
      if (record.type === "attributes" && record.target instanceof Element) scan(record.target);
      record.addedNodes?.forEach((node) => { if (node instanceof Element) scan(node); });
    }));
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startScrollReveal, { once: true });
  else startScrollReveal();
})();

/* Profile editor placement and mobile section navigation. */
(() => {
  const profile = document.getElementById("profile");
  if (!profile) return;

  const openButton = document.getElementById("openProfileEditor");
  const editorPanel = document.getElementById("profileEditorPanel");
  const closeButton = document.getElementById("closeProfileEditor");

  const openEditor = () => {
    if (!editorPanel) return;
    // Present the existing editor as a dedicated view within the Profile section.
    // No route/API/auth changes are needed; the existing profile form remains intact.
    profile.classList.add("profile-edit-mode");
    editorPanel.hidden = false;
    editorPanel.classList.add("profile-editor-is-open");
    editorPanel.setAttribute("aria-label", "Edit your profile details");
    profile.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
    const firstField = editorPanel.querySelector("input:not([type='checkbox']):not([type='file']), textarea, select");
    if (firstField) window.setTimeout(() => firstField.focus({ preventScroll: true }), 250);
  };

  const closeEditor = () => {
    if (!editorPanel) return;
    editorPanel.hidden = true;
    editorPanel.classList.remove("profile-editor-is-open");
    profile.classList.remove("profile-edit-mode");
    if (openButton) {
      openButton.focus({ preventScroll: true });
      openButton.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  };

  if (openButton) openButton.addEventListener("click", openEditor);
  if (closeButton) closeButton.addEventListener("click", closeEditor);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && editorPanel && !editorPanel.hidden) closeEditor();
  });

  // Explicitly scroll to the chosen section after closing the mobile drawer.
  // This prevents the fixed dashboard toolbar/drawer from making navigation
  // appear to change the URL while leaving the old section on screen.
  const sidebar = document.querySelector("body > header");
  const toggle = document.getElementById("dashboardSidebarToggle");
  const mobileNav = window.matchMedia("(max-width: 760px)");

  if (sidebar) {
    sidebar.querySelectorAll('nav a[href^="#"]').forEach(link => {
      link.addEventListener("click", event => {
        const id = decodeURIComponent(link.hash.slice(1));
        const target = document.getElementById(id);
        if (!target || target.hidden) return;

        event.preventDefault();
        if (mobileNav.matches) {
          document.body.classList.remove("mobile-nav-open");
          if (toggle) {
            toggle.setAttribute("aria-pressed", "false");
            toggle.setAttribute("aria-label", "Open navigation menu");
            toggle.title = "Open navigation menu";
          }
        }

        if (window.location.hash !== link.hash) {
          window.history.pushState(null, "", link.hash);
        }

        sidebar.querySelectorAll('nav a[aria-current="page"]').forEach(item => item.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "page");

        window.requestAnimationFrame(() => {
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
          });
        });
      });
    });
  }
})();