import {
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  supabase
} from '../lib/supabase'

import './AdminManagementPage.css'


function AdminManagementPage({
  user
}) {
  const [
    admins,
    setAdmins
  ] = useState([])

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    workingId,
    setWorkingId
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')


  const loadAdmins =
    useCallback(
      async () => {
        setError('')


        const {
          data,
          error:
            requestError
        } =
          await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              email,
              role,
              approval_status,
              approved_by,
              approved_at,
              created_at
            `)
            .in(
              'role',
              [
                'admin',
                'super_admin'
              ]
            )
            .order(
              'created_at',
              {
                ascending: false
              }
            )


        if (
          requestError
        ) {
          setError(
            requestError.message
          )
        } else {
          setAdmins(
            data || []
          )
        }


        setLoading(false)
      },
      []
    )


  useEffect(
    () => {
      loadAdmins()
    },
    [loadAdmins]
  )


  async function updateStatus(
    admin,
    status
  ) {
    if (
      admin.role ===
      'super_admin'
    ) {
      return
    }


    setWorkingId(
      admin.id
    )

    setError('')


    const update = {
      approval_status:
        status
    }


    if (
      status ===
      'approved'
    ) {
      update.approved_by =
        user.id

      update.approved_at =
        new Date()
          .toISOString()
    }


    const {
      error:
        updateError
    } =
      await supabase
        .from('profiles')
        .update(update)
        .eq(
          'id',
          admin.id
        )


    if (
      updateError
    ) {
      setError(
        updateError.message
      )
    } else {
      await loadAdmins()
    }


    setWorkingId('')
  }


  const pending =
    admins.filter(
      (admin) =>
        admin
          .approval_status ===
        'pending'
    )


  const active =
    admins.filter(
      (admin) =>
        admin
          .approval_status !==
        'pending'
    )


  if (loading) {
    return (
      <div className="admin-management-loading">
        Loading Administrators...
      </div>
    )
  }


  return (
    <section className="admin-management-page">

      <header className="admin-management-heading">

        <div>
          <p className="eyebrow">
            SUPER ADMIN
          </p>

          <h1>
            Admin Management
          </h1>

          <span>
            Review administrator registrations and control portal access.
          </span>
        </div>


        <div className="admin-management-count">
          <strong>
            {
              pending.length
            }
          </strong>

          <span>
            Pending
          </span>
        </div>

      </header>


      {error && (
        <div className="admin-management-error">
          {error}
        </div>
      )}


      <section className="admin-request-section">

        <div className="admin-section-title">

          <h2>
            Pending Requests
          </h2>

          <span>
            {
              pending.length
            }
          </span>

        </div>


        {pending.length ===
        0 ? (
          <div className="admin-empty-state">
            No administrator requests are waiting for approval.
          </div>
        ) : (
          <div className="admin-request-grid">

            {pending.map(
              (admin) => (
                <AdminCard
                  key={
                    admin.id
                  }
                  admin={
                    admin
                  }
                  working={
                    workingId ===
                    admin.id
                  }
                  onApprove={() =>
                    updateStatus(
                      admin,
                      'approved'
                    )
                  }
                  onReject={() =>
                    updateStatus(
                      admin,
                      'rejected'
                    )
                  }
                />
              )
            )}

          </div>
        )}

      </section>


      <section className="admin-request-section">

        <div className="admin-section-title">

          <h2>
            Administrators
          </h2>

          <span>
            {
              active.length
            }
          </span>

        </div>


        <div className="admin-list">

          {active.map(
            (admin) => (
              <div
                key={
                  admin.id
                }
                className="admin-list-row"
              >

                <div className="admin-list-avatar">
                  {
                    (
                      admin.full_name
                      ||
                      admin.email
                      ||
                      'A'
                    )
                      .charAt(0)
                      .toUpperCase()
                  }
                </div>


                <div className="admin-list-identity">

                  <strong>
                    {
                      admin.full_name
                      ||
                      'Administrator'
                    }
                  </strong>

                  <span>
                    {
                      admin.email
                    }
                  </span>

                </div>


                <span
                  className={
                    admin.role ===
                    'super_admin'
                      ? 'admin-role super'
                      : 'admin-role'
                  }
                >
                  {
                    admin.role ===
                    'super_admin'
                      ? 'Super Admin'
                      : 'Admin'
                  }
                </span>


                <span
                  className={
                    `admin-status ${admin.approval_status}`
                  }
                >
                  {
                    admin.approval_status
                  }
                </span>


                {admin.role !==
                  'super_admin' && (
                  <div className="admin-row-actions">

                    {admin
                      .approval_status !==
                      'approved' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(
                            admin,
                            'approved'
                          )
                        }
                        disabled={
                          workingId ===
                          admin.id
                        }
                      >
                        Approve
                      </button>
                    )}


                    {admin
                      .approval_status ===
                      'approved' && (
                      <button
                        type="button"
                        className="revoke"
                        onClick={() =>
                          updateStatus(
                            admin,
                            'revoked'
                          )
                        }
                        disabled={
                          workingId ===
                          admin.id
                        }
                      >
                        Revoke
                      </button>
                    )}

                  </div>
                )}

              </div>
            )
          )}

        </div>

      </section>

    </section>
  )
}


function AdminCard({
  admin,
  working,
  onApprove,
  onReject
}) {
  return (
    <article className="admin-request-card">

      <div className="admin-request-avatar">
        {
          (
            admin.full_name
            ||
            admin.email
            ||
            'A'
          )
            .charAt(0)
            .toUpperCase()
        }
      </div>


      <div className="admin-request-info">

        <strong>
          {
            admin.full_name
            ||
            'Administrator'
          }
        </strong>

        <span>
          {admin.email}
        </span>

        <small>
          Waiting for approval
        </small>

      </div>


      <div className="admin-request-actions">

        <button
          type="button"
          onClick={
            onApprove
          }
          disabled={
            working
          }
        >
          Approve
        </button>


        <button
          type="button"
          className="reject"
          onClick={
            onReject
          }
          disabled={
            working
          }
        >
          Reject
        </button>

      </div>

    </article>
  )
}


export default AdminManagementPage
