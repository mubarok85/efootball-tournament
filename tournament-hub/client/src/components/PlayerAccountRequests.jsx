import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './PlayerAccountRequests.css'


const API_BASE =
  String(
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(
    /\/+$/,
    ''
  )


function PlayerAccountRequests() {
  const [
    accounts,
    setAccounts
  ] = useState([])

  const [
    globalPlayers,
    setGlobalPlayers
  ] = useState([])

  const [
    opened,
    setOpened
  ] = useState(true)

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    processing,
    setProcessing
  ] = useState('')

  const [
    selectedPlayers,
    setSelectedPlayers
  ] = useState({})

  const [
    error,
    setError
  ] = useState('')


  const pending =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            account
              .approval_status ===
            'pending'
        ),
      [accounts]
    )


  const approved =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            account
              .approval_status ===
            'approved'
        ),
      [accounts]
    )


  const api =
    useCallback(
      async (
        path,
        options = {}
      ) => {
        const {
          data: {
            session
          }
        } =
          await supabase
            .auth
            .getSession()


        if (
          !session
            ?.access_token
        ) {
          throw new Error(
            'Admin session is unavailable.'
          )
        }


        const response =
          await fetch(
            `${API_BASE}${path}`,
            {
              ...options,

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${session.access_token}`,

                ...options.headers
              }
            }
          )


        const data =
          await response
            .json()
            .catch(
              () => ({})
            )


        if (!response.ok) {
          const error =
            new Error(
              data.message ||
              'Request failed.'
            )

          error.payload =
            data

          throw error
        }


        return data
      },
      []
    )


  const load =
    useCallback(
      async () => {
        setLoading(true)
        setError('')


        try {
          const data =
            await api(
              '/api/player-accounts/admin/requests'
            )


          setAccounts(
            data.accounts ||
            []
          )

          setGlobalPlayers(
            data.global_players ||
            []
          )

        } catch (
          loadError
        ) {
          setError(
            loadError.message
          )
        } finally {
          setLoading(false)
        }
      },
      [api]
    )


  useEffect(
    () => {
      load()
    },
    [load]
  )


  async function approve(
    account,
    forceNew = false
  ) {
    setProcessing(
      account.id
    )

    setError('')


    try {
      await api(
        `/api/player-accounts/admin/${account.id}/approve`,
        {
          method: 'POST',

          body:
            JSON.stringify({
              global_player_id:
                selectedPlayers[
                  account.id
                ]
                ||
                null,

              confirm_new_player:
                forceNew
            })
        }
      )


      await load()

    } catch (
      approvalError
    ) {
      if (
        approvalError
          .payload
          ?.code ===
        'POSSIBLE_DUPLICATE_PLAYER'
      ) {
        const names =
          (
            approvalError
              .payload
              .possible_players ||
            []
          )
            .map(
              (player) =>
                player.name
            )
            .join(', ')


        const confirmed =
          window.confirm(
            `Possible duplicate found: ${names}.\n\nCreate a separate new player anyway?`
          )


        if (confirmed) {
          setProcessing('')

          await approve(
            account,
            true
          )

          return
        }
      } else {
        setError(
          approvalError.message
        )
      }

    } finally {
      setProcessing('')
    }
  }


  async function reject(
    account
  ) {
    if (
      !window.confirm(
        `Reject ${account.full_name}'s registration?`
      )
    ) {
      return
    }


    setProcessing(
      account.id
    )


    try {
      await api(
        `/api/player-accounts/admin/${account.id}/reject`,
        {
          method: 'POST',
          body: '{}'
        }
      )

      await load()

    } catch (
      rejectError
    ) {
      setError(
        rejectError.message
      )
    } finally {
      setProcessing('')
    }
  }


  async function suspend(
    account
  ) {
    if (
      !window.confirm(
        `Suspend ${account.full_name}'s account?`
      )
    ) {
      return
    }


    setProcessing(
      account.id
    )


    try {
      await api(
        `/api/player-accounts/admin/${account.id}/suspend`,
        {
          method: 'POST',
          body: '{}'
        }
      )

      await load()

    } catch (
      suspendError
    ) {
      setError(
        suspendError.message
      )
    } finally {
      setProcessing('')
    }
  }


  return (
    <section className="player-account-requests">

      <button
        type="button"
        className="account-request-header"
        onClick={() =>
          setOpened(
            !opened
          )
        }
      >
        <div>
          <span>
            PLAYER ACCOUNTS
          </span>

          <strong>
            Registration Requests
          </strong>
        </div>


        <div className="request-count">
          {pending.length}
          {' '}
          Pending
        </div>
      </button>


      {opened && (
        <div className="request-body">

          {error && (
            <div className="request-error">
              {error}
            </div>
          )}


          {loading ? (
            <div className="request-empty">
              Loading player accounts...
            </div>
          ) : pending.length === 0 ? (
            <div className="request-empty">
              No pending registrations.
            </div>
          ) : (
            <div className="request-grid">

              {pending.map(
                (account) => (
                  <article
                    key={
                      account.id
                    }
                    className="request-card"
                  >

                    <div className="request-user">

                      <span className="request-avatar">
                        {
                          account
                            .full_name
                            .charAt(0)
                            .toUpperCase()
                        }
                      </span>


                      <div>
                        <strong>
                          {
                            account
                              .full_name
                          }
                        </strong>

                        <span>
                          @
                          {
                            account
                              .username
                          }
                        </span>

                        <small>
                          {
                            account
                              .email
                          }
                        </small>
                      </div>

                    </div>


                    <label className="existing-player-link">

                      Existing Player

                      <small>
                        If this person already exists in the global Player Library, select them here.
                      </small>


                      <select
                        value={
                          selectedPlayers[
                            account.id
                          ]
                          ||
                          ''
                        }
                        onChange={
                          (event) =>
                            setSelectedPlayers({
                              ...selectedPlayers,

                              [
                                account.id
                              ]:
                                event
                                  .target
                                  .value
                            })
                        }
                      >
                        <option value="">
                          Create New Global Player
                        </option>

                        {globalPlayers.map(
                          (player) => (
                            <option
                              key={
                                player.id
                              }
                              value={
                                player.id
                              }
                            >
                              {
                                player.name
                              }
                            </option>
                          )
                        )}
                      </select>

                    </label>


                    <div className="request-actions">

                      <button
                        type="button"
                        className="request-approve"
                        disabled={
                          processing ===
                          account.id
                        }
                        onClick={() =>
                          approve(
                            account
                          )
                        }
                      >
                        Approve
                      </button>


                      <button
                        type="button"
                        className="request-reject"
                        disabled={
                          processing ===
                          account.id
                        }
                        onClick={() =>
                          reject(
                            account
                          )
                        }
                      >
                        Reject
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}


          {approved.length > 0 && (
            <div className="approved-accounts">

              <h3>
                Approved Players
              </h3>


              {approved.map(
                (account) => (
                  <div
                    key={
                      account.id
                    }
                    className="approved-account-row"
                  >
                    <div>
                      <strong>
                        {
                          account
                            .full_name
                        }
                      </strong>

                      <span>
                        @
                        {
                          account
                            .username
                        }
                      </span>
                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        suspend(
                          account
                        )
                      }
                    >
                      Suspend
                    </button>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      )}

    </section>
  )
}


export default PlayerAccountRequests
