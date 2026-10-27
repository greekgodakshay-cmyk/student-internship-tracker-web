(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const safeImage = (value) => typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value);
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  };
  const initials = (name) => (String(name || 'Student').trim().charAt(0) || 'S').toUpperCase();
  const dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const profileUrl = (authorId) => `${window.location.origin}/index.html?profile=${encodeURIComponent(authorId)}#posts`;
  async function request(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
    return data;
  }

  function avatarFor(author, className = 'social-post-avatar') {
    if (safeImage(author?.photoData)) {
      const image = element('img', undefined, className);
      image.src = author.photoData;
      image.alt = `${author.name || 'Student'} profile photo`;
      image.loading = 'lazy';
      return image;
    }
    return element('span', initials(author?.name), `${className} social-post-avatar-fallback`);
  }

  async function renderPostCard(post, { allowDelete = false, compact = false } = {}) {
    const card = element('article', undefined, `social-post-card${compact ? ' social-post-card-compact' : ''}`);
    card.dataset.postId = post.id;
    const author = element('div', undefined, 'social-post-author');
    const authorLink = element('a', undefined, 'social-post-author-link');
    authorLink.href = profileUrl(post.author?.id);
    authorLink.append(avatarFor(post.author));
    const authorCopy = element('span', undefined, 'social-post-author-copy');
    authorCopy.append(element('strong', post.author?.name || 'Student'), element('small', dateLabel(post.createdAt)));
    authorLink.append(authorCopy);
    author.append(authorLink);
    if (allowDelete) {
      const deleteButton = element('button', 'Delete');
      deleteButton.type = 'button';
      deleteButton.className = 'social-post-delete';
      deleteButton.setAttribute('aria-label', 'Delete your post');
      deleteButton.addEventListener('click', async () => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        deleteButton.disabled = true;
        try { await request(`/api/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' }); await refreshAll(); }
        catch (error) { deleteButton.title = error.message; deleteButton.disabled = false; }
      });
      author.append(deleteButton);
    }
    card.append(author, element('p', post.content, 'social-post-content'));

    const actions = element('div', undefined, 'social-post-actions');
    const appreciate = element('button', '☆ Appreciate'); appreciate.type = 'button';
    const commentToggle = element('button', 'Comment'); commentToggle.type = 'button';
    const share = element('button', 'Share'); share.type = 'button';
    actions.append(appreciate, commentToggle, share); card.append(actions);
    const comments = element('div', undefined, 'social-post-comments'); comments.hidden = true;
    const commentList = element('div', undefined, 'social-post-comment-list');
    const form = element('form', undefined, 'social-post-comment-form');
    const input = element('input'); input.type = 'text'; input.maxLength = 500; input.required = true; input.placeholder = 'Write a professional comment…'; input.setAttribute('aria-label', 'Write a comment');
    const submit = element('button', 'Comment'); submit.type = 'submit'; form.append(input, submit); comments.append(commentList, form); card.append(comments);
    const api = `/api/posts/${encodeURIComponent(post.id)}`;
    async function refreshInteractions() {
      const data = await request(`${api}/interactions`);
      appreciate.textContent = `${data.liked ? '★' : '☆'} Appreciate${data.likes ? ` · ${data.likes}` : ''}`;
      appreciate.setAttribute('aria-pressed', String(data.liked));
      commentList.replaceChildren();
      (data.comments || []).forEach((comment) => {
        const row = element('p', undefined, 'social-post-comment');
        row.append(element('strong', `${comment.name || 'Student'}: `), document.createTextNode(comment.text || ''));
        commentList.append(row);
      });
      if (!(data.comments || []).length) commentList.append(element('p', 'No comments yet.', 'social-post-no-comments'));
    }
    appreciate.addEventListener('click', async () => {
      appreciate.disabled = true;
      try { const data = await request(`${api}/like`, { method: 'POST', body: '{}' }); appreciate.textContent = `${data.liked ? '★' : '☆'} Appreciate${data.likes ? ` · ${data.likes}` : ''}`; appreciate.setAttribute('aria-pressed', String(data.liked)); }
      catch (error) { appreciate.title = error.message; }
      finally { appreciate.disabled = false; }
    });
    commentToggle.addEventListener('click', () => { comments.hidden = !comments.hidden; if (!comments.hidden) input.focus(); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); submit.disabled = true;
      try { await request(`${api}/comments`, { method: 'POST', body: JSON.stringify({ text: input.value.trim() }) }); input.value = ''; await refreshInteractions(); }
      catch (error) { submit.title = error.message; }
      finally { submit.disabled = false; }
    });
    share.addEventListener('click', async () => {
      const url = profileUrl(post.author?.id);
      try {
        if (navigator.share) await navigator.share({ title: `${post.author?.name || 'Student'} on Lock-in`, text: post.content, url });
        else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); share.textContent = 'Link copied'; }
        else window.prompt('Copy this profile link', url);
      } catch (error) { if (error.name !== 'AbortError') share.title = 'Unable to open sharing options.'; }
    });
    try { await refreshInteractions(); } catch (error) { commentList.append(element('p', error.message, 'social-post-error')); }
    return card;
  }

  async function loadPosts(url, container, options = {}) {
    if (!container) return [];
    container.replaceChildren(element('p', 'Loading posts…', 'social-post-state'));
    try {
      const data = await request(url);
      const posts = Array.isArray(data.posts) ? data.posts : [];
      container.replaceChildren();
      if (!posts.length) container.append(element('p', options.emptyMessage || 'No posts yet.', 'social-post-state'));
      for (const post of posts) container.append(await renderPostCard(post, { allowDelete: Boolean(options.allowDelete && String(post.author?.id) === String(options.userId)), compact: Boolean(options.compact) }));
      return posts;
    } catch (error) {
      container.replaceChildren(element('p', error.message || 'Unable to load posts.', 'social-post-state social-post-error'));
      return [];
    }
  }

  let currentUserId = '';
  async function refreshAll() {
    await Promise.all([
      loadPosts('/api/posts', $('socialFeedList'), { emptyMessage: 'No public posts yet. Be the first to share an update.' }),
      currentUserId ? loadPosts(`/api/posts?profile=${encodeURIComponent(currentUserId)}`, $('myPostsGrid'), { userId: currentUserId, allowDelete: true, compact: true, emptyMessage: 'You have not posted anything yet.' }) : Promise.resolve([])
    ]);
  }

  async function initialize() {
    const form = $('socialPostForm');
    const input = $('socialPostContent');
    const submit = $('socialPostSubmit');
    const status = $('socialPostStatus');
    try {
      const me = await request('/api/auth/me');
      currentUserId = String(me.user?._id || me.user?.id || '');
    } catch (_) { currentUserId = ''; }
    if (form) form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) { status.textContent = 'Write something before publishing.'; input.focus(); return; }
      submit.disabled = true; status.textContent = 'Publishing…';
      try { await request('/api/posts', { method: 'POST', body: JSON.stringify({ content }) }); input.value = ''; status.textContent = 'Your post has been published.'; await refreshAll(); }
      catch (error) { status.textContent = error.message; }
      finally { submit.disabled = false; }
    });
    await refreshAll();
  }

  async function renderPublicProfile(container, profileId) {
    const heading = element('h4', 'Posts');
    const grid = element('div', undefined, 'public-profile-post-grid');
    container.append(heading, grid);
    await loadPosts(`/api/posts?profile=${encodeURIComponent(profileId)}`, grid, { compact: true, emptyMessage: 'No posts posted yet.' });
  }

  window.StudentPosts = { renderPublicProfile, refresh: refreshAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
