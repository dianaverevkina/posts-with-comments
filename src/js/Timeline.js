import { ajax } from 'rxjs/ajax';
import { forkJoin } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';

export default class Timeline {
  constructor() {
    this.container = null;
  }

  init() {
    this.bindToDOM();
    this.subscribeOnNewPosts();
  }

  bindToDOM() {
    this.container = document.querySelector('.root');
    this.postsContainer = this.container.querySelector('.timeline__container');
  }

  subscribeOnNewPosts() {
    this.getPostsWithComments().subscribe(
      (posts) => {
        const sortedPosts = this.sortArr(posts);
        sortedPosts.forEach((post) => this.renderItem(post));
      },

      (error) => console.error(error),
    );
  }

  getPostsWithComments() {
    const posts$ = ajax.getJSON('http://localhost:3000/posts/latest');

    return posts$.pipe(
      map((response) => {
        if (response.status !== 'ok') {
          throw new Error('Ошибка при получении постов');
        }

        return response.data;
      }),
      mergeMap((posts) => {
        const postObservables = posts.map((post) => {
          const comments$ = ajax.getJSON(`http://localhost:3000/posts/${post.id}/comments/latest`);
          return comments$.pipe(
            map((response) => {
              if (response.status !== 'ok') {
                throw new Error('Ошибка при получении комментариев');
              }
              const comments = response.data;
              return { ...post, comments };
            }),
          );
        });

        return forkJoin(postObservables);
      }),
      catchError((error) => {
        throw new Error(error.message || 'Произошла ошибка');
      }),
    );
  }

  sortArr(arr) {
    return arr.sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
  }

  renderItem(post) {
    const item = document.createElement('div');
    item.classList.add('post');
    item.dataset.id = post.id;
    item.innerHTML = `
      <div class="post__block">
        <div class="post__avatar">
          <img src="${post.avatar}" alt="">
        </div>
        <p class="post__author">${post.author}
          <span class="post__date">${this.getDate(post.created)}</span>
        </p>
      </div>
      <div class="post__content">
        <img src="${post.image}" alt="">
      </div>
      <div class="post__comments comments">
        <p class="comments__title">Latest comments</p>
        <div class="comments__container"></div>
        <button class="comments__btn">Load more</button>
      </div>
    `;

    this.postsContainer.prepend(item);
    this.commentsContainer = item.querySelector('.comments__container');

    const sortedComments = this.sortArr(post.comments);
    sortedComments.forEach((comment) => this.addComment(comment));
  }

  getDate(date) {
    const newDate = new Date(date);

    const formattedDate = newDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

    const formattedTime = newDate.toLocaleTimeString('ru-RU', {
      hour: 'numeric',
      minute: 'numeric',
    });

    return `${formattedTime} ${formattedDate}`;
  }

  addComment({
    id, avatar, author, content, created,
  }) {
    const item = document.createElement('div');
    item.classList.add('comments__item', 'comment');
    item.dataset.id = id;
    item.innerHTML = `
      <div class="comment__avatar">
        <img src="${avatar}" alt="">
      </div>
      <div class="comment__block">
        <div class="comment__row">
          <p class="comment__author">${author}</p>
          <p class="comment__date">${this.getDate(created)}</p>
        </div>
        <div class="comment__row">
          <p class="comment__content">${content}</p>
        </div>
      </div>
    `;

    this.commentsContainer.prepend(item);
  }
}
