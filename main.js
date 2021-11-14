'use strict';

class Work {
	id = (Date.now() + '').slice(-10);
	constructor(coords, work, time) {
		this.work = work;
		this.time = time;
		this.coords = coords;

		this._setDescription();
	}

	_setDescription() {
		this.description = `${this.work}`;
	}

	async _setWeather() {
		try {
			const [lat, lng] = this.coords;
			const dataRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=efe2f5d493e6d4639fa096da2405d21d`);
			const data = await dataRes.json();
			this.weather = data.weather['0'].description;
		} catch (e) {
			throw e;
		}
	}
}

const form = document.querySelector('.form--work');
const containerWork = document.querySelector('.work');
const errorMessage = document.querySelector('.form__error--work');
const resetBtn = document.querySelector('.btn--reset');
const allWorkBtn = document.querySelector('.btn--showAll');
const inputWork = document.querySelector('.form__input--work');
const inputTime = document.querySelector('.form__input--time');

class App {
	#map;
	#mapEvent;
	#works = [];
	#mapZoom = 13;
	#editForm;

	constructor() {
		// get location
		this._getLocation();

		// get local storage data
		this._getLocalStorage();

		//submit the form
		form.addEventListener('submit', this._newWork.bind(this));

		//move to popup
		containerWork.addEventListener('click', this._movetoPopup.bind(this));

		//reset button
		resetBtn.addEventListener('click', this._reset);

		//show All work
		allWorkBtn.addEventListener('click', this._showAllWork.bind(this));

		//delete work
		containerWork.addEventListener('click', this._deleteWork.bind(this));

		//edit work
		containerWork.addEventListener('click', this._editWork.bind(this));
	}
	_getLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
				alert('cannot get your position');
			});
		}
	}
	_loadMap(position) {
		const { latitude, longitude } = position.coords;
		this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom);

		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		this.#map.on('click', this._showFrom.bind(this));

		this.#works.forEach(work => {
			this._renderWorkMarker(work);
		});
	}

	_showFrom(mapE) {
		this.#mapEvent = mapE;
		form.style.display = 'flex';
		form.classList.remove('hidden');
		inputWork.focus();
	}

	_hideForm() {
		inputWork.value = '';
		inputTime.value = '';

		form.style.display = 'none';
		form.classList.add('hidden');

		setTimeout(() => {
			form.style.display = 'flex';
		}, 1000);
	}

	_validInput(element, message) {
		element.textContent = message;
		setTimeout(() => {
			element.textContent = '';
		}, 2000);
	}

	async _newWork(e) {
		try {
			e.preventDefault();
			const workValue = inputWork.value;
			const timeValue = inputTime.value;
			const { lat, lng } = this.#mapEvent.latlng;

			//input valid
			if (!workValue || !timeValue) {
				this._validInput(errorMessage, 'empty input!! please enter something');
				return;
			}

			if (workValue.length > 300) {
				this._validInput(errorMessage, 'The work input is too long!!');
				return;
			}

			const work = new Work([lat, lng], workValue, timeValue);

			//hide form
			this._hideForm();

			//set weather
			await work._setWeather();

			//add work to array
			this.#works.push(work);

			//set to local storage
			this._setLocalStorage();

			//render work list
			this._renderWork(work);

			//render marker in map
			this._renderWorkMarker(work);

			console.log(work);
		} catch (e) {
			console.log(e);
		}
	}

	_deleteWork(e) {
		const deleteBtn = e.target.closest('.btn--delete');
		if (!deleteBtn) return;

		const workEl = deleteBtn.closest('.work--list--item');

		const index = this.#works.findIndex(work => work.id === workEl.dataset.id);

		//remove target work from works array
		this.#works.splice(index, 1);

		//re store local storage
		this._setLocalStorage();

		//remove work from DOM
		workEl.remove();

		//re-render marker
		this._reRenderMarker();
	}

	_editWork(e) {
		const editBtn = e.target.closest('.btn--edit');
		if (!editBtn) return;

		const workEl = editBtn.closest('.work--list--item');

		//get current work edit form
		this.#editForm = workEl.querySelector('.form--edit');

		//find current work
		const work = this.#works.find(el => el.id === workEl.dataset.id);

		//render/hidden form
		this.#editForm.classList.toggle('hidden');

		////////////////////DOM////////////////////
		const editWorkEl = this.#editForm.querySelector('.form__input--work');
		const editTimeEl = this.#editForm.querySelector('.form__input--time');
		const errorMessage = this.#editForm.querySelector('.form__error--work');
		const workListTitle = workEl.querySelector('.work--list--title');
		const workListTime = workEl.querySelector('.work--list--time');
		//default value
		editWorkEl.value = work.work;
		editTimeEl.value = work.time;

		const editFormCallback = function (e) {
			e.preventDefault();

			const workValue = editWorkEl.value;
			const timeValue = editTimeEl.value;

			//input valid
			if (!workValue || !timeValue) {
				this._validInput(errorMessage, 'empty input, please input something!');
			}

			if (workValue.length > 300) {
				this._validInput(errorMessage, 'work is too long!');
			}

			//update work object
			work.work = workValue;
			work.time = timeValue;
			work._setDescription();

			//update local storage
			this._setLocalStorage();

			//hidden form
			this.#editForm.style.display = 'none';
			this.#editForm.classList.add('hidden');
			setTimeout(() => {
				this.#editForm.style.display = 'flex';
			}, 1000);

			//render work
			workListTitle.textContent = `👉 ${workValue}`;
			workListTime.textContent = `⌚ ${timeValue.replace('T', ' ')}`;

			//re-render marker
			this._reRenderMarker();
		};

		this.#editForm.addEventListener('submit', editFormCallback.bind(this));
	}

	_renderWork(work) {
		const html = `
        <li class="work--list--item" data-id="${work.id}">
            <h2 class="work--list--title">👉 ${work.work}</h2>
            <h3 class="work--list--time">⌚ ${work.time.replace('T', ' ')}</h3>
			<h4 class="work--list--weather">current weather : ${work.weather}</h4>
            <div class="workItem-btn-group">
                <button class="btn btn--edit">edit ✍</button>
                <button class="btn btn--delete">delete 🗑</button>
            </div>
            <form class="form form--edit hidden">
                <label for="form__input--work">work</label>
                <input type="text" name="form__input--work" class="form__input form__input--work" placeholder="what you want to do...">
                <label for="form__input--time">time</label>
                <input type="datetime-local" name="form__input--time" class="form__input form__input--time">
                <h4 class="form__error form__error--work"></h4>
                <button class="btn btn-submit">ADD ✅</button>
            </form>
        </li>
        `;
		form.insertAdjacentHTML('afterend', html);
	}

	_renderWorkMarker(work) {
		L.marker(work.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 0,
					autoClose: false,
					closeOnClick: false,
					className: 'popup',
				})
			)
			.setPopupContent(`${work.description}`)
			.openPopup();
	}

	_reRenderMarker() {
		//remove all marker without map layer
		this.#map.eachLayer(layer => {
			if (layer._leaflet_id !== 26) {
				this.#map.removeLayer(layer);
			}
		});

		//render all the marker again
		this.#works.forEach(work => {
			this._renderWorkMarker(work);
		});
	}

	_movetoPopup(e) {
		const workEl = e.target.closest('.work--list--item');

		if (!workEl) return;

		const work = this.#works.find(el => el.id === workEl.dataset.id);

		this.#map.setView(work.coords, this.#mapZoom, {
			animate: true,
			pan: {
				easeLinearity: 1,
			},
		});
	}

	_showAllWork() {
		this.#map.setView([0, 0], 0, {
			animate: true,
			pan: {
				easeLinearity: 1,
			},
		});
	}

	_setLocalStorage() {
		localStorage.setItem('works', JSON.stringify(this.#works));
	}

	async _getLocalStorage() {
		const works = JSON.parse(localStorage.getItem('works'));

		if (!works) return;

		this.#works = works;

		// this.#works.forEach(work => {
		// 	this._renderWork(work);
		// 	work.__proto__ = Work.prototype;
		// });

		await Promise.all(
			this.#works.map(async work => {
				work.__proto__ = Work.prototype;
				await work._setWeather();
				this._renderWork(work);
			})
		);
	}

	_reset() {
		localStorage.removeItem('works');
		location.reload();
	}
}

new App();
